(() => {
  'use strict';
  const glow = document.createElement('div');
  glow.className = 'gaze-glow';
  glow.innerHTML = '<div class="gaze-glow-orb"></div>';
  const glowOrb = glow.querySelector('.gaze-glow-orb');
  glow.setAttribute('aria-hidden', 'true');
  const controls = document.createElement('div');
  controls.className = 'gaze-controls';
  controls.innerHTML = '<span class="gaze-status" role="status"></span><button type="button" aria-pressed="false">视线光晕</button>';
  const status = controls.querySelector('span');
  const toggle = controls.querySelector('button');
  const dialog = document.createElement('dialog');
  dialog.className = 'gaze-dialog';
  dialog.setAttribute('aria-label', '视线光晕设置');
  document.body.append(glow, controls, dialog);
  const dwellIndicator = document.createElement('div');
  dwellIndicator.className = 'gaze-dwell-indicator';
  dwellIndicator.setAttribute('aria-hidden', 'true');
  dwellIndicator.hidden = true;
  dwellIndicator.innerHTML = '<span></span>';
  document.body.append(dwellIndicator);
  let dwellTarget = null, clickedTarget = null, dwellElapsed = 0, lastGaze = 0, outsideSince = null, dwellRegion;
  let visualTarget = null, animationFrame = 0, visualTime = 0;
  const gazeFilter = window.createGazeFilter();
  let candidateTarget = null, candidateSince = 0, stableSince = 0;
  let clickedRegion = null, releaseSince = null;
  const gazeGrace = 900;
  const dwellDuration = 1500;
  const edgeDuration = 1500;
  const glowRadius = 460;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let glowFlight, revealTimer, revealing = false, calibrationPosition = null;
  let frame, state = 'off', timer, lostTimer, sampleTimer, samplePending = false, step = 0, samples = 0, smooth;
  const targets = [[.5,.5],[.12,.12],[.88,.12],[.88,.88],[.12,.88]];
  const samplesPerPoint = 8;
  const send = data => frame?.contentWindow?.postMessage({ channel: 'hytex-gaze', ...data }, location.origin);
  const edgeIndicator = document.createElement('div');
  edgeIndicator.className = 'gaze-scroll-indicator';
  edgeIndicator.setAttribute('aria-hidden', 'true');
  edgeIndicator.hidden = true;
  document.body.append(edgeIndicator);
  let edgeDirection = 0, edgeElapsed = 0, edgeLast = 0, edgeBlocked = 0, edgeRelease = null, edgeScroller = null;

  function resetEdge(clearBlock = false) {
    edgeDirection = 0; edgeElapsed = 0; edgeLast = 0; edgeScroller = null;
    edgeIndicator.hidden = true;
    if (clearBlock) { edgeBlocked = 0; edgeRelease = null; }
  }

  function scrollableAt(x, y, direction) {
    const modals = [...document.querySelectorAll('dialog[open]')];
    const modal = modals.at(-1);
    const hit = document.elementFromPoint(x, y);
    const canScroll = element => element && element.scrollHeight > element.clientHeight + 1 &&
      (direction < 0 ? element.scrollTop > 1 : element.scrollTop + element.clientHeight < element.scrollHeight - 1);
    if (modal && !modal.contains(hit)) return null;
    for (let element = hit; element && element !== document.body; element = element.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(element).overflowY) && canScroll(element)) return element;
      if (element === modal) return null;
    }
    if (modal || window.HYTEX_ROOM?.state.introLocked) return null;
    const viewport = document.getElementById('journey-viewport');
    return viewport?.getClientRects().length && canScroll(viewport) ? viewport : null;
  }

  function updateEdgeScroll(x, y, filtered, now) {
    const band = Math.min(120, innerHeight * .16);
    const zone = value => value < band ? -1 : value > innerHeight - band ? 1 : 0;
    const rawDirection = zone(y), filteredDirection = zone(filtered.y);
    // A clear look back toward the middle re-arms scrolling; jitter at the edge does not.
    if (edgeBlocked) {
      if (y > band + 28 && y < innerHeight - band - 28 && filtered.y > band + 28 && filtered.y < innerHeight - band - 28) {
        edgeRelease ??= now;
        if (now - edgeRelease >= 450) { edgeBlocked = 0; edgeRelease = null; }
      } else edgeRelease = null;
    }
    if (!rawDirection || rawDirection !== filteredDirection || clickableAt(x, y) || clickableAt(filtered.x, filtered.y) || dwellTarget) {
      resetEdge(); return false;
    }
    if (edgeBlocked) { resetEdge(); return true; }
    const scroller = scrollableAt(x, y, rawDirection);
    if (!scroller) { resetEdge(); return false; }
    if (edgeDirection !== rawDirection || edgeScroller !== scroller || now - edgeLast >= gazeGrace) {
      resetEdge(); edgeDirection = rawDirection; edgeScroller = scroller;
    } else edgeElapsed += Math.min(now - edgeLast, 250);
    edgeLast = now;
    const modal = scroller.closest('dialog[open]');
    const host = modal || document.body;
    if (edgeIndicator.parentNode !== host) host.append(edgeIndicator);
    edgeIndicator.classList.toggle('at-top', edgeDirection < 0);
    edgeIndicator.style.setProperty('--edge-progress', `${Math.min(1, edgeElapsed / edgeDuration) * 100}%`);
    edgeIndicator.textContent = `${edgeDirection < 0 ? '↑ 向上' : '↓ 向下'}浏览 · ${(Math.max(0, edgeDuration - edgeElapsed) / 1000).toFixed(1)}秒`;
    edgeIndicator.hidden = false;
    if (edgeElapsed >= edgeDuration) {
      const direction = edgeDirection;
      edgeBlocked = direction;
      resetEdge(); resetDwell();
      scroller.scrollBy({ top: direction * Math.round(Math.min(480, scroller.clientHeight * .65)), behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    }
    return true;
  }


  function resetDwell() {
    dwellTarget = null; dwellElapsed = 0; outsideSince = null; dwellRegion = null;
    candidateTarget = null; candidateSince = 0; stableSince = 0;
    dwellIndicator.hidden = true;
    dwellIndicator.classList.remove('paused');
  }

  function resetVisual() {
    cancelAnimationFrame(animationFrame); animationFrame = 0; visualTime = 0;
    gazeFilter.reset(); visualTarget = null; smooth = null;
    glow.classList.remove('visible');
  }

  function animateGlow(now) {
    animationFrame = 0;
    if (!visualTarget || state !== 'active') return;
    const dt = Math.min(50, Math.max(0, now - (visualTime || now - 16)));
    visualTime = now;
    const alpha = 1 - Math.exp(-dt / 55);
    smooth.x += (visualTarget.x - smooth.x) * alpha;
    smooth.y += (visualTarget.y - smooth.y) * alpha;
    glowOrb.style.transform = `translate3d(${smooth.x - glowRadius}px, ${smooth.y - glowRadius}px, 0)`;
    if (Math.hypot(visualTarget.x - smooth.x, visualTarget.y - smooth.y) > .5) {
      animationFrame = requestAnimationFrame(animateGlow);
    } else visualTime = 0;
  }

  function filterGaze(x, y, now) {
    const filtered = gazeFilter.update(x, y, now);
    visualTarget = filtered;
    if (!smooth) smooth = { ...filtered };
    if (!animationFrame) animationFrame = requestAnimationFrame(animateGlow);
    glow.classList.add('visible');
    return filtered;
  }

  function clickableAt(x, y) {
    const target = document.elementFromPoint(x, y)?.closest('button, a[href], summary, [role="button"], input[type="button"], input[type="submit"], input[type="checkbox"], input[type="radio"]');
    return target?.matches(':disabled') || target?.closest('[inert], [aria-disabled="true"], [hidden]') ? null : target;
  }

  const inside = (x, y, rect) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

  function pauseDwell(now) {
    candidateTarget = null;
    if (!dwellTarget) return;
    outsideSince ??= now;
    stableSince = 0;
    dwellIndicator.classList.add('paused');
    dwellIndicator.querySelector('span').textContent = '进度已保留 · 看回光晕';
    if (now - outsideSince >= gazeGrace) resetDwell();
  }

  function updateDwell(x, y, filtered, now) {
    const gap = now - lastGaze;
    if (gap >= gazeGrace) resetDwell();
    lastGaze = now;
    const rawTarget = clickableAt(x, y);
    const filteredTarget = clickableAt(filtered.x, filtered.y);
    // Keep the clicked region latched even if the click replaces the underlying control.
    if (clickedTarget) {
      if (inside(x, y, clickedRegion) || inside(filtered.x, filtered.y, clickedRegion)) releaseSince = null;
      else {
        releaseSince ??= now;
        if (now - releaseSince >= 450) { clickedTarget = null; clickedRegion = null; releaseSince = null; }
      }
    }
    if (dwellTarget) {
      const current = dwellTarget.getBoundingClientRect();
      const moved = Math.abs(current.left - dwellRegion.targetLeft) > 4 || Math.abs(current.top - dwellRegion.targetTop) > 4 || Math.abs(current.width - dwellRegion.targetWidth) > 4 || Math.abs(current.height - dwellRegion.targetHeight) > 4;
      // Recheck the original hit to avoid activating a control covered by a new overlay.
      if (moved || !dwellTarget.isConnected || clickableAt(dwellRegion.anchorX, dwellRegion.anchorY) !== dwellTarget) resetDwell();
    }
    if (!dwellTarget) {
      const target = filteredTarget;
      if (!target || (clickedTarget && (inside(x, y, clickedRegion) || inside(filtered.x, filtered.y, clickedRegion))) || target === clickedTarget || (rawTarget && rawTarget !== target) || Math.hypot(x - filtered.x, y - filtered.y) > 100) {
        candidateTarget = null; return;
      }
      if (candidateTarget !== target) { candidateTarget = target; candidateSince = now; return; }
      if (now - candidateSince < 160) return;
      const rect = target.getBoundingClientRect();
      const width = Math.min(innerWidth, Math.max(112, Math.min(160, rect.width + 56)));
      const height = Math.min(innerHeight, Math.max(112, Math.min(160, rect.height + 56)));
      const left = Math.max(0, Math.min(filtered.x - width / 2, innerWidth - width));
      const top = Math.max(0, Math.min(filtered.y - height / 2, innerHeight - height));
      dwellTarget = target;
      stableSince = candidateSince;
      dwellElapsed = Math.min(now - candidateSince, 250);
      dwellRegion = { left, top, right: left + width, bottom: top + height, anchorX: filtered.x, anchorY: filtered.y, targetLeft: rect.left, targetTop: rect.top, targetWidth: rect.width, targetHeight: rect.height };
      const host = target.closest('dialog[open]') || document.body;
      if (dwellIndicator.parentNode !== host) host.append(dwellIndicator);
      Object.assign(dwellIndicator.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });
      dwellIndicator.classList.toggle('label-below', top < 40);
      dwellIndicator.hidden = false;
    } else {
      const inRange = inside(x, y, dwellRegion) && inside(filtered.x, filtered.y, dwellRegion);
      const anotherControl = (rawTarget && rawTarget !== dwellTarget) || (filteredTarget && filteredTarget !== dwellTarget);
      if (!inRange || anotherControl) { pauseDwell(now); return; }
      if (outsideSince !== null && now - outsideSince >= gazeGrace) { resetDwell(); return; }
      // Blank space inside the visible tolerance region is allowed; adjacent controls are not.
      if (outsideSince === null) dwellElapsed += Math.min(gap, 250);
      else stableSince = now;
      outsideSince = null;
      dwellIndicator.classList.remove('paused');
    }
    dwellIndicator.style.setProperty('--dwell-progress', `${Math.min(1, dwellElapsed / dwellDuration) * 100}%`);
    dwellIndicator.querySelector('span').textContent = `放松注视 · ${(Math.max(0, dwellDuration - dwellElapsed) / 1000).toFixed(1)}秒`;
    if (dwellElapsed >= dwellDuration && now - stableSince >= 350) {
      const target = dwellTarget;
      clickedTarget = target; clickedRegion = { ...dwellRegion }; releaseSince = null;
      resetDwell();
      target.click();
    }
  }

  function stop(message = '') {
    // Removing the isolated frame also discards its model and any pending camera request.
    send({ type: 'stop' });
    frame?.remove(); frame = null;
    clearTimeout(timer); clearTimeout(lostTimer); clearTimeout(sampleTimer); clearTimeout(revealTimer);
    glowFlight?.cancel();
    revealing = false; calibrationPosition = null;
    glow.classList.remove('travelling', 'waiting');
    document.body.append(glow);
    samplePending = false;
    resetDwell(); clickedTarget = null; clickedRegion = null; releaseSince = null; lastGaze = 0;
    state = 'off'; resetVisual(); resetEdge(true);
    toggle.textContent = '视线光晕'; toggle.setAttribute('aria-pressed', 'false');
    status.textContent = message;
    controls.classList.remove('enabled');
    controls.classList.toggle('has-status', !!message);
    if (dialog.open) dialog.close();
  }

  function showConsent() {
    dialog.classList.remove('calibrating', 'revealing');
    dialog.innerHTML = '<h2>让视线点亮页面</h2><p>使用摄像头估算你正在看的位置，跟着看五个光点即可，无需点击，约需十五秒。</p><p>画面仅在本机处理，不上传，也不保存画面或校准数据。首次开启需要下载识别模型。</p><p>在按钮或链接附近放松注视 1.5 秒即可点击。短暂晃动会保留进度，持续移开视线即可取消。持续看向页面顶部或底部 1.5 秒可滚动一次，移开后可再次触发。</p><p>可以随时关闭。不同意授权也能正常浏览，背景保持黑色。</p><div class="gaze-dialog-actions"><button type="button" data-cancel>暂不开启</button><button type="button" data-start>开启摄像头</button></div>';
    dialog.querySelector('[data-cancel]').onclick = () => dialog.close();
    dialog.querySelector('[data-start]').onclick = start;
    dialog.showModal();
  }

  function start() {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      stop('当前浏览器无法使用摄像头，已保持黑色背景'); return;
    }
    state = 'loading';
    controls.classList.add('enabled');
    controls.classList.remove('has-status');
    dialog.innerHTML = '<h2>正在准备视线互动</h2><p>请在浏览器提示中选择是否允许摄像头。授权后会加载识别模型。</p><div class="gaze-dialog-actions"><button type="button">取消</button></div>';
    dialog.querySelector('button').onclick = () => stop();
    toggle.textContent = '关闭视线光晕';
    frame = document.createElement('iframe');
    frame.className = 'gaze-frame'; frame.title = '本地视线识别';
    frame.tabIndex = -1; frame.setAttribute('aria-hidden', 'true'); frame.allow = 'camera';
    frame.src = './gaze-tracker.html';
    document.body.append(frame);
    timer = setTimeout(() => stop('准备超时，已停止摄像头并保持黑色背景'), 90000);
  }

  function calibrate() {
    clearTimeout(timer); state = 'calibrating'; step = 0; samples = 0;
    timer = setTimeout(() => stop('暂未完成校准，已停止摄像头，需要时可重新开启'), 60000);
    dialog.classList.add('calibrating');
    dialog.innerHTML = '<div class="gaze-calibration-shade"></div><div class="gaze-calibration-copy"><h2>跟着光晕看就好</h2><p>注视光晕中心，完成后它会飞向下一处。无需点击。</p><p id="gaze-progress" role="status"></p></div><button type="button" class="gaze-calibration-cancel">取消校准</button>';
    const cancel = dialog.querySelector('.gaze-calibration-cancel');
    cancel.onclick = () => stop();
    cancel.focus({ preventScroll: true });
    calibrationPosition = null;
    dialog.append(glow);
    glow.classList.add('visible');
    movePoint();
  }

  function scheduleSample(delay = 180) {
    clearTimeout(sampleTimer);
    sampleTimer = setTimeout(() => {
      if (state !== 'calibrating') return;
      samplePending = true;
      send({ type: 'sample', step, x: calibrationPosition.x, y: calibrationPosition.y });
    }, delay);
  }

  async function movePoint() {
    const destination = { x: targets[step][0] * innerWidth, y: targets[step][1] * innerHeight };
    const previous = calibrationPosition;
    calibrationPosition = destination;
    const transform = position => `translate3d(${position.x - glowRadius}px, ${position.y - glowRadius}px, 0)`;
    glowOrb.style.transform = transform(destination);
    glow.classList.remove('waiting');
    dialog.querySelector('#gaze-progress').textContent = `注视光晕 ${step + 1} / ${targets.length}`;
    if (previous && !reducedMotion.matches) {
      glow.classList.add('travelling');
      const timing = { duration: 850, easing: 'cubic-bezier(.4,0,.2,1)' };
      glowFlight = glowOrb.animate([{ transform: transform(previous) }, { transform: transform(destination) }], timing);
      try { await glowFlight.finished; } catch { return; }
      if (state !== 'calibrating') return;
      glow.classList.remove('travelling');
    }
    // Never train on a moving target: wait for arrival, then allow fixation to settle.
    scheduleSample(700);
  }

  function finishCalibration() {
    clearTimeout(timer);
    state = 'active'; revealing = true;
    smooth = { ...calibrationPosition }; visualTarget = { ...smooth };
    gazeFilter.reset(); visualTime = 0;
    dialog.classList.add('revealing');
    toggle.setAttribute('aria-pressed', 'true');
    status.textContent = '已开启 · 凝视 1.5 秒点击 · 上下边缘可滚动';
    // Keep the same halo above the fading shade, already driven by live gaze.
    revealTimer = setTimeout(() => {
      if (state !== 'active') return;
      document.body.append(glow);
      dialog.close();
      dialog.classList.remove('revealing');
      revealing = false;
      resetDwell(); lastGaze = 0;
    }, reducedMotion.matches ? 0 : 1100);
    lostTimer = setTimeout(() => resetVisual(), 700);
  }

  window.addEventListener('message', event => {
    if (!frame || event.source !== frame.contentWindow || event.origin !== location.origin || event.data?.channel !== 'hytex-gaze') return;
    const data = event.data;
    if (data.type === 'error') { stop(data.denied ? '未开启摄像头，已保持黑色背景' : '视线识别暂不可用，已停止摄像头'); return; }
    if (data.type === 'ready' && state === 'loading') calibrate();
    if (data.type === 'sampled' && state === 'calibrating' && samplePending && data.step === step) {
      samplePending = false;
      glow.classList.toggle('waiting', !data.accepted);
      if (!data.accepted) {
        dialog.querySelector('#gaze-progress').textContent = '等待看清眼睛，正对摄像头后会自动继续';
        scheduleSample(250); return;
      }
      dialog.querySelector('#gaze-progress').textContent = `注视光晕 ${step + 1} / ${targets.length}`;
      samples++;
      if (samples === samplesPerPoint) {
        samples = 0; step++;
        if (step === targets.length) {
          finishCalibration();
        } else movePoint();
      } else scheduleSample();
    }
    if (data.type === 'gaze' && state === 'active') {
      const { x, y } = data;
      if (!data.valid || !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > innerWidth || y > innerHeight) {
        pauseDwell(performance.now()); resetEdge(); return;
      }
      const now = performance.now();
      const filtered = filterGaze(x, y, now);
      clearTimeout(lostTimer);
      lostTimer = setTimeout(() => { resetVisual(); resetDwell(); resetEdge(); }, gazeGrace);
      if (!revealing) {
        updateDwell(x, y, filtered, now);
        if (state !== 'active') return;
        if (updateEdgeScroll(x, y, filtered, now)) resetDwell();
      }
      if (dwellRegion && (outsideSince === null || now - outsideSince < 160)) {
        visualTarget = { x: (dwellRegion.left + dwellRegion.right) / 2, y: (dwellRegion.top + dwellRegion.bottom) / 2 };
      }
    }
  });
  document.addEventListener('gaze-open', () => {
    if (document.querySelector('dialog[open]')) return;
    if (state !== 'off') stop();
    showConsent();
  });
  toggle.onclick = () => state === 'off' ? showConsent() : stop('视线光晕已关闭');
  dialog.addEventListener('cancel', event => { event.preventDefault(); stop(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && state !== 'off') stop('已停止摄像头，需要时可重新开启'); });
  document.addEventListener('scroll', () => { resetDwell(); resetVisual(); resetEdge(); }, true);
  document.addEventListener('close', () => { resetDwell(); resetEdge(); }, true);
  document.addEventListener('pointerdown', () => { resetDwell(); resetEdge(); }, true);
  window.addEventListener('pagehide', () => stop());
  window.addEventListener('resize', () => { if (state === 'active' || state === 'calibrating') stop('窗口尺寸已改变，请重新开启并校准'); });
  document.addEventListener('spatial-interactive-mode', event => { if (!event.detail.active) stop(); });
})();
