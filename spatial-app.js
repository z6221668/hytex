'use strict';
(() => {
  const data = window.RESUME;
  const chapters = [...document.querySelectorAll('[data-chapter]')];
  const dialog = document.querySelector('#project-dialog');
  const state = { chapter: 0, skill: 1, project: 0, career: 0, filter: 'all', paused: matchMedia('(prefers-reduced-motion: reduce)').matches };
  let opener = null, typingFrame = 0, typingStarted = 0, typingText = '', scrolling = false;
  let careerScrollTarget = null;
  const dispatch = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));
  const el = (tag, className, value) => { const n = document.createElement(tag); n.className = className; if (value !== undefined) n.textContent = value; return n; };
  function initHobbyMedia() {
    const media = window.HYTEX_HOBBIES || {}, section = document.querySelector('#hobbies');
    const photos = (media.photos || []).filter(photo => photo.src);
    if (!photos.length) return;
    section.hidden = false;
    const nav = el('a', ''); nav.href = '#hobbies'; nav.setAttribute('aria-label', '爱好'); nav.append(el('span', '', '06'), el('i', '')); document.querySelector('.chapter-rail').append(nav);
    section.append(document.querySelector('.closing'));
    section.classList.add('photos-only');
    const gallery = document.querySelector('#hobby-photos'), viewer = document.querySelector('#photo-dialog');
    let photoOpener, photoAnimation, photoClosing = false, photoVersion = 0;
    const original = document.querySelector('#photo-original');
    const reducedPhotoMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
    function photoOrigin() {
      const source = photoOpener.getBoundingClientRect(), target = original.getBoundingClientRect();
      return `translate(${source.left + source.width / 2 - target.left - target.width / 2}px, ${source.top + source.height / 2 - target.top - target.height / 2}px) scale(${source.width / target.width}, ${source.height / target.height})`;
    }
    async function closePhoto() {
      if (!viewer.open || photoClosing) return;
      photoClosing = true; ++photoVersion;
      const current = getComputedStyle(original).transform;
      photoAnimation?.cancel(); viewer.classList.remove('photo-revealed');
      if (!reducedPhotoMotion()) {
        photoAnimation = original.animate([{ transform: current }, { transform: photoOrigin() }], { duration: 420, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' });
        await photoAnimation.finished.catch(() => {});
      }
      viewer.close();
    }
    photos.forEach((photo, index) => {
      const figure = el('figure', 'hobby-photo'), button = el('button', 'photo-open'), img = el('img', ''); button.type = 'button';
      img.src = photo.src; img.alt = photo.alt || photo.caption || `照片 ${String(index + 1).padStart(2, '0')}`; img.loading = 'lazy'; img.decoding = 'async';
      if (photo.width && photo.height) { img.width = photo.width; img.height = photo.height; button.style.aspectRatio = `${photo.width} / ${photo.height}`; }
      button.setAttribute('aria-label', `放大查看：${img.alt}`); button.append(img); figure.append(button);
      const caption = el('figcaption', ''); caption.append(el('span', '', String(index + 1).padStart(2, '0')), el('p', '', photo.caption || '')); figure.append(caption); gallery.append(figure);
      img.addEventListener('load', () => { button.style.aspectRatio = String(img.naturalWidth / img.naturalHeight); });
      button.addEventListener('click', async () => {
        if (viewer.open) return;
        const version = ++photoVersion;
        photoOpener = button; photoClosing = false;
        original.src = photo.src; original.alt = img.alt;
        original.width = photo.width || img.naturalWidth; original.height = photo.height || img.naturalHeight;
        await original.decode().catch(() => {});
        if (version !== photoVersion) return;
        document.querySelector('#photo-caption').textContent = photo.caption || '';
        viewer.classList.remove('photo-revealed'); viewer.showModal();
        document.body.classList.add('media-open'); dispatch('spatial-modal', true);
        button.classList.add('photo-lifted');
        if (reducedPhotoMotion()) { viewer.classList.add('photo-revealed'); return; }
        const origin = photoOrigin(), tilt = index % 2 ? -2 : 2;
        // The same image travels from its album slot; only transforms animate.
        photoAnimation = original.animate([
          { transform: origin },
          { transform: `translate(0,-18px) rotate(${tilt}deg) scale(1.025)`, offset: .76 },
          { transform: 'none' }
        ], { duration: 720, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
        viewer.classList.add('photo-revealed');
        await photoAnimation.finished.catch(() => {});
        if (version === photoVersion && !photoClosing) { photoAnimation.cancel(); photoAnimation = null; }
      });
    });
    if (!photos.length) gallery.hidden = true;
    if (photos.length === 1) gallery.classList.add('single-photo');
    if (photos.length === 2) gallery.classList.add('two-photos');
    viewer.querySelector('button').addEventListener('click', closePhoto);
    viewer.addEventListener('cancel', event => { event.preventDefault(); closePhoto(); });
    viewer.addEventListener('click', event => { if (event.target !== viewer) return; const r = viewer.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closePhoto(); });
    viewer.addEventListener('close', () => { ++photoVersion; photoAnimation?.cancel(); photoAnimation = null; photoClosing = false; viewer.classList.remove('photo-revealed'); photoOpener?.classList.remove('photo-lifted'); document.body.classList.remove('media-open'); dispatch('spatial-modal', false); photoOpener?.focus({ preventScroll: true }); });
  }
  initHobbyMedia();
  function typeDescription(instant = false) {
    cancelAnimationFrame(typingFrame);
    const paragraph = document.querySelector('#skill-description'), reading = document.querySelector('#skill-reading');
    reading.classList.remove('released');
    typingText = data.skills[state.skill].description;
    const characters = Array.from(typingText);
    reading.classList.toggle('typing', !instant);
    paragraph.textContent = instant ? typingText : '';
    if (instant) return;
    typingStarted = performance.now();
    function type(now) {
      const count = Math.floor((now - typingStarted) / 1000 * 28);
      paragraph.textContent = characters.slice(0, count).join('');
      if (count < characters.length) typingFrame = requestAnimationFrame(type);
      else { reading.classList.remove('typing'); dispatch('spatial-description-complete', { index: state.skill }); }
    }
    typingFrame = requestAnimationFrame(type);
  }
  function selectSkill(index, initial = false) {
    state.skill = index;
    const skill = data.skills[index];
    document.querySelector('#skill-title').textContent = skill.name;
    document.querySelector('#skill-kind').textContent = skill.kind;
    document.querySelectorAll('[data-skill-index]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.skillIndex) === index)));
    cancelAnimationFrame(typingFrame); document.querySelector('#skill-reading').classList.remove('typing');
    if (!initial && window.HYTEX_SCENE_READY) { document.querySelector('#skill-description').textContent = ''; dispatch('spatial-select-skill', { index }); }
    else typeDescription(initial || matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  data.skills.forEach((skill, index) => {
    const b = el('button', '', skill.name); b.type = 'button'; b.dataset.skillIndex = index; b.setAttribute('aria-pressed', String(index === state.skill));
    b.addEventListener('click', () => selectSkill(index)); document.querySelector('#skill-index').append(b);
  });
  selectSkill(1, true);
  const filtered = () => data.projects.map((p, index) => ({ p, index })).filter(({ p }) => state.filter === 'all' || p.category === state.filter);
  function selectProject(index) {
    state.project = index;
    document.querySelectorAll('[data-project-index]').forEach(b => b.classList.toggle('selected', Number(b.dataset.projectIndex) === index));
    const items = filtered();
    document.querySelector('#archive-count').textContent = `${String(items.findIndex(p => p.index === index) + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
    dispatch('spatial-select-project', { index });
  }
  function showProject(index, source) {
    if (dialog.open) return;
    opener = source;
    selectProject(index);
    const p = data.projects[index];
    for (const [id, value] of Object.entries({ 'dialog-number': p.number, 'dialog-category': p.label, 'dialog-title': p.title, 'dialog-period': p.period, 'dialog-summary': p.summary })) document.getElementById(id).textContent = value;
    document.querySelector('#dialog-tags').replaceChildren(...p.tags.map(t => el('span', '', t)));
    document.querySelector('#dialog-work').replaceChildren(...p.details.map(t => el('li', '', t)));
    dialog.classList.remove('detail-ready', 'detail-leaving');
    const spatial = window.HYTEX_SCENE_READY && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    dialog.classList.toggle('spatial-detail', Boolean(spatial));
    dialog.showModal(); dialog.scrollTop = 0; document.body.classList.add('dialog-open'); dispatch('spatial-modal', true);
    if (spatial) dispatch('spatial-project-open', { index });
    else dialog.classList.add('detail-ready');
  }
  function renderProjects() {
    document.querySelector('#project-list').replaceChildren(...filtered().map(({ p, index }) => {
      const b = el('button', 'project-row'); b.type = 'button'; b.dataset.projectIndex = index; b.setAttribute('aria-haspopup', 'dialog');
      const content = el('div', ''); content.append(el('h3', '', p.title), el('p', '', `${p.label} / ${p.period}`));
      b.append(el('span', '', p.number), content, el('span', '', '↗'));
      b.addEventListener('pointerenter', () => selectProject(index)); b.addEventListener('focus', () => selectProject(index)); b.addEventListener('click', () => showProject(index, b));
      return b;
    }));
    const items = filtered(); if (!items.some(p => p.index === state.project)) state.project = items[0].index;
    selectProject(state.project);
  }
  document.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => {
    state.filter = b.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === b)));
    renderProjects(); dispatch('spatial-filter-projects', { indices: filtered().map(p => p.index) });
  }));
  renderProjects();
  for (const [id, step] of [['project-prev', -1], ['project-next', 1]]) document.getElementById(id).addEventListener('click', () => { const items = filtered(), index = items.findIndex(p => p.index === state.project); selectProject(items[(index + step + items.length) % items.length].index); });
  document.querySelector('#archive-open').addEventListener('click', event => showProject(state.project, event.currentTarget));
  data.experience.forEach((job, index) => {
    const row = el('article', 'career-item'); row.tabIndex = 0;
    row.dataset.careerIndex = index; row.style.setProperty('--career-accent', job.accent);
    const heading = el('div', 'career-heading'); heading.append(el('span', 'career-number', String(index + 1).padStart(2, '0')), el('p', '', job.period));
    const tags = el('div', 'career-tags'); tags.append(...job.tags.map(tag => el('span', '', tag)));
    row.append(heading, el('h3', '', job.company), el('p', 'role', job.role), el('p', 'description', job.description), tags);
    row.addEventListener('pointerenter', () => selectCareer(index)); row.addEventListener('focus', () => selectCareer(index)); row.addEventListener('click', () => selectCareer(index));
    row.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectCareer(index); } });
    document.querySelector('#career-list').append(row);
  });
  function selectCareer(index, scroll = false) {
    state.career = index;
    document.querySelectorAll('.career-item').forEach((row, i) => { row.classList.toggle('selected', index === i); if (index === i) row.setAttribute('aria-current', 'step'); else row.removeAttribute('aria-current'); });
    if (state.chapter === 3) document.querySelector('#scene-caption-title').textContent = `${data.experience[index].shortCompany} · ${data.experience[index].period}`;
    dispatch('spatial-select-career', { index });
    if (scroll) {
      careerScrollTarget = { index };
      document.querySelectorAll('.career-item')[index].scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
    }
  }
  selectCareer(0);
  document.addEventListener('spatial-pick-career', event => selectCareer(event.detail.index, true));
  function closeProject() {
    if (dialog.classList.contains('detail-leaving')) return;
    if (dialog.classList.contains('spatial-detail') && window.HYTEX_SCENE_READY) {
      dialog.classList.add('detail-leaving'); dispatch('spatial-project-close');
    } else { dialog.close(); finishProjectClose(); }
  }
  dialog.querySelector('form').addEventListener('submit', event => { event.preventDefault(); closeProject(); });
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeProject(); });
  document.addEventListener('spatial-project-ready', () => dialog.classList.add('detail-ready'));
  function finishProjectClose() {
    if (dialog.open || !document.body.classList.contains('dialog-open')) return;
    dialog.classList.remove('spatial-detail', 'detail-ready', 'detail-leaving'); document.body.classList.remove('dialog-open');
    dispatch('spatial-modal', false); if (opener?.isConnected) opener.focus({ preventScroll: true });
  }
  document.addEventListener('spatial-project-returned', () => { if (dialog.open) dialog.close(); finishProjectClose(); });
  dialog.addEventListener('close', finishProjectClose);
  dialog.addEventListener('click', event => { if (event.target !== dialog) return; const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeProject(); });
  document.querySelector('#copy-email').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText('68449317@qq.com'); document.querySelector('#copy-status').textContent = '邮箱已复制。'; }
    catch { document.querySelector('#copy-status').textContent = '请选中邮箱复制，或点击邮箱直接发送邮件。'; }
  });
  const toggle = document.querySelector('#motion-toggle');
  function setPaused(paused) { state.paused = paused; toggle.setAttribute('aria-pressed', String(paused)); toggle.setAttribute('aria-label', paused ? '播放场景动画' : '暂停场景动画'); toggle.querySelector('.motion-symbol').textContent = paused ? '▷' : 'Ⅱ'; toggle.querySelector('.motion-word').textContent = paused ? '播放动画' : '暂停动画'; dispatch('spatial-pause', paused); }
  toggle.addEventListener('click', () => setPaused(!state.paused));
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', e => { setPaused(e.matches); if (e.matches) typeDescription(true); });
  setPaused(state.paused);
  document.querySelector('#replay-query').addEventListener('click', () => dispatch('spatial-replay-query'));
  const codeTabs = [...document.querySelectorAll('[data-code-mode]')];
  let codeMode = 'parallel', queryStep = { serialLine: 0, parallelLine: 0, submitting: true, serialStates: [0, 0, 0], parallelStates: [0, 0, 0] };
  const taskNames = ['用户资料', '订单列表', '账户信息'];
  document.querySelectorAll('.query-code-demo code>span').forEach(line => {
    const tokens = line.textContent.split(/(@ParallelScope|\b(?:public|var|return|new|submit|await)\b)/g);
    line.replaceChildren(...tokens.map((value, index) => index % 2 ? el('b', 'code-keyword', value) : document.createTextNode(value)));
  });
  function renderQueryCode() {
    const parallel = codeMode === 'parallel', active = parallel ? queryStep.parallelLine : queryStep.serialLine;
    const states = parallel ? queryStep.parallelStates : queryStep.serialStates;
    const done = states.every(value => value === 2);
    document.querySelectorAll(`#code-panel-${codeMode} code>span`).forEach(line => {
      const number = Number(line.dataset.line);
      line.classList.toggle('active', number === active);
      line.classList.toggle('complete', parallel ? number >= 2 && number <= 4 && states[number - 2] === 2 : number >= 1 && number <= 3 && states[number - 1] === 2);
    });
    const waiting = states.findIndex(value => value !== 2);
    document.querySelector('#query-code-status').textContent = done ? '三项结果已返回，组成 Profile' : queryStep.submitting ? (parallel ? '依次提交三个任务，不等待查询完成' : '准备执行第一个查询') : parallel ? `三个查询已提交，等待${taskNames[waiting]}` : `正在查询${taskNames[waiting]}，其余任务等待`;
  }
  function selectCodeMode(mode) {
    codeMode = mode;
    codeTabs.forEach(tab => { const selected = tab.dataset.codeMode === mode; tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1; document.querySelector(`#code-panel-${tab.dataset.codeMode}`).hidden = !selected; });
    renderQueryCode();
  }
  codeTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectCodeMode(tab.dataset.codeMode));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : (index + 1) % 2;
      selectCodeMode(codeTabs[next].dataset.codeMode); codeTabs[next].focus();
    });
  });
  document.addEventListener('spatial-query-step', event => { queryStep = event.detail; renderQueryCode(); });
  document.addEventListener('spatial-renderer-fallback', () => { document.querySelector('#query-code-status').textContent = 'Java 执行流程示例'; });
  renderQueryCode();
  const captions = [ ['BACKEND / AI / PRODUCT', 'Java 后端 · AI 应用 · 跨端开发'], ['JAVA / SPRING / DATA', '点击节点查看技术实践'], ['PROJECT ARCHIVE', '项目描述与负责的工作'], ['2018 — 2026', 'Java 后端开发经历'], ['PARALLEL QUERY', '独立查询，同时执行'], ['KEEP IN TOUCH', '68449317@qq.com'], ['', ''] ];
  function updateChapter() {
    scrolling = false;
    const probe = innerWidth <= 700 ? 240 : innerHeight * .45;
    let nearest = 0;
    chapters.forEach((s, i) => { if (!s.hidden && s.getBoundingClientRect().top <= probe) nearest = i; });
    if (nearest !== state.chapter || !document.body.dataset.chapter) {
      state.chapter = nearest; document.body.dataset.chapter = nearest;
      document.querySelectorAll('.chapter-rail a').forEach((a, i) => { a.classList.toggle('active', i === nearest); if (i === nearest) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
      document.querySelectorAll('.header nav a').forEach(a => a.classList.toggle('active', a.hash === `#${chapters[nearest].id}`));
      document.querySelector('#scene-caption-kicker').textContent = captions[nearest][0]; document.querySelector('#scene-caption-title').textContent = nearest === 2 ? data.projects[state.project].title : captions[nearest][1];
      document.querySelector('.archive-controls').classList.toggle('visible', nearest === 2);
      dispatch('spatial-chapter', { index: nearest });
    }
    dispatch('spatial-scroll', { progress: Math.min(1, Math.max(0, -chapters[nearest].getBoundingClientRect().top / Math.max(1, chapters[nearest].offsetHeight - innerHeight * .3))) });
    if (nearest === 3) {
      const readingPoint = (innerHeight + (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0)) / 2;
      const visible = [...document.querySelectorAll('.career-item')].map((row, index) => ({ index, rect: row.getBoundingClientRect() })).filter(({ rect }) => rect.bottom > 110 && rect.top < innerHeight * .85);
      // A card click owns the selection while its company scrolls into view;
      // intermediate rows must not select themselves during that animation.
      if (visible.length && !careerScrollTarget) { const closest = visible.reduce((a, b) => Math.abs(a.rect.top + a.rect.height / 2 - readingPoint) < Math.abs(b.rect.top + b.rect.height / 2 - readingPoint) ? a : b); if (closest.index !== state.career) selectCareer(closest.index); }
      document.querySelector('#scene-caption-title').textContent = `${data.experience[state.career].shortCompany} · ${data.experience[state.career].period}`;
    }
  }
  window.addEventListener('scroll', () => { if (!scrolling) { scrolling = true; requestAnimationFrame(updateChapter); } }, { passive: true }); window.addEventListener('resize', updateChapter);
  window.addEventListener('scrollend', () => {
    if (careerScrollTarget) {
      const rect = document.querySelectorAll('.career-item')[careerScrollTarget.index].getBoundingClientRect();
      const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      if (Math.abs(rect.top + rect.height / 2 - (innerHeight + padding) / 2) > 8) return;
      careerScrollTarget = null;
    }
    updateChapter();
  });
  for (const type of ['wheel', 'touchstart']) window.addEventListener(type, () => { careerScrollTarget = null; }, { passive: true });
  window.addEventListener('keydown', event => { if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) careerScrollTarget = null; });
  document.addEventListener('spatial-pick-skill', e => selectSkill(e.detail.index));
  document.addEventListener('spatial-skill-released', () => { cancelAnimationFrame(typingFrame); document.querySelector('#skill-reading').classList.remove('typing'); document.querySelector('#skill-reading').classList.add('released'); document.querySelector('#skill-description').textContent = '点击技术名称查看说明。'; });
  document.addEventListener('spatial-skill-arrived', e => { if (e.detail.index === state.skill) typeDescription(matchMedia('(prefers-reduced-motion: reduce)').matches); });
  document.addEventListener('spatial-pick-project', e => showProject(e.detail.index, document.querySelector('#archive-open')));
  document.addEventListener('spatial-select-project', e => { if (state.chapter === 2) document.querySelector('#scene-caption-title').textContent = data.projects[e.detail.index].title; });
  document.addEventListener('spatial-renderer-fallback', () => { window.HYTEX_SCENE_READY = false; document.body.classList.add('no-webgl'); typeDescription(true); });
  window.HYTEX_SPATIAL = { state, selectSkill, selectProject, showProject };
  updateChapter();
})();
