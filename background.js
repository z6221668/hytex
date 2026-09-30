'use strict';
(() => {
  const root = document.querySelector('#skill-orbs');
  const foreground = document.querySelector('#dock-ball-host');
  const note = document.querySelector('#tech-note');
  const select = document.querySelector('#tech-select');
  const toggle = document.querySelector('#motion-toggle');
  const text = document.querySelector('#skill-description');
  const measure = document.querySelector('#typing-measure');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.querySelector('#particles');
  const ctx = canvas.getContext('2d');
  const TRAVEL_SECONDS = 2.2, DEPART_SPAN = 1.7, INTAKE_SECONDS = .55, EMIT_START = .69, EMIT_SECONDS = .55;
  const PORTAL_SECONDS = DEPART_SPAN + EMIT_START + EMIT_SECONDS + .32, DISPLAY_SECONDS = 10, CHARACTERS_PER_SECOND = 28;
  const random = (min, max) => min + Math.random() * (max - min);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const ease = v => v * v * (3 - 2 * v);
  const palette = { lime: [135, 107, 60], green: [68, 117, 78], warm: [132, 112, 73], rose: [153, 104, 84], blue: [71, 116, 136], neutral: [99, 120, 98] };
  let width = innerWidth, height = innerHeight, frame = 0, lastTime = null;
  let clock = 0, nextVisit = 2.5, active = null, previousIndex = -1;
  let paused = preference.matches, modalOpen = false, particles = [], paintCounter = 0;
  let readingRegions = [], headerBottom = 84, regionFrame = 0;
  const balls = window.RESUME.skills.map((skill, index) => {
    const node = document.createElement('button');
    node.type = 'button'; node.tabIndex = -1;
    node.className = `background-orb ${skill.color}${skill.name.length > 6 ? ' long-label' : ''}`;
    node.dataset.skill = skill.name;
    node.setAttribute('aria-label', `查看 ${skill.name} 技术说明`);
    const surface = document.createElement('canvas');
    surface.setAttribute('aria-hidden', 'true');
    const label = document.createElement('strong');
    label.textContent = skill.name;
    node.append(surface, label); root.append(node);
    const option = document.createElement('option');
    option.value = index; option.textContent = skill.name; select.append(option);
    const count = skill.size > 140 ? 280 : 150;
    // Fibonacci points give each cloud a spherical outline without a solid surface.
    const points = Array.from({ length: count }, (_, i) => {
      const y = 1 - 2 * i / (count - 1), r = Math.sqrt(1 - y * y), angle = i * Math.PI * (3 - Math.sqrt(5));
      return { x: Math.cos(angle) * r, y, z: Math.sin(angle) * r };
    });
    const ball = { node, option, skill, index, surface, paint: surface.getContext('2d'), points, x: 0, y: 0, vx: 0, vy: 0, turnAt: 0, radius: 0, placed: false, goal: null, dismissed: false };
    node.addEventListener('click', event => {
      event.stopPropagation();
      if (active?.ball === ball) {
        if (active.phase === 'describe') recycle();
        else if (active.phase === 'approach') active.recycleRequested = true;
      }
      else selectBall(ball);
    });
    return ball;
  });
  function place(ball) { ball.node.style.transform = `translate3d(${ball.x - ball.radius}px,${ball.y - ball.radius}px,0)`; }
  function refreshRegions() {
    regionFrame = 0;
    headerBottom = Math.max(0, document.querySelector('.header').getBoundingClientRect().bottom);
    readingRegions = [...document.querySelectorAll('.hero h1,.hero-statement,.hero-description,.hero-meta,.hero-actions,.github-link,.background-controls,.skill-group h3,.skill-tool-list,.skill-practice,.project-card h3,.project-summary,.card-top,.project-view,.query-demo,.timeline-item,.education-list,.contact,.project-toolbar')]
      .map(node => node.getBoundingClientRect()).filter(rect => rect.bottom > 0 && rect.top < height);
    balls.forEach(ball => { ball.goal = null; updateExposure(ball); });
  }
  function coverage(point, radius) {
    let area = 0;
    for (const rect of readingRegions) {
      const dx = Math.max(0, Math.min(point.x + radius, rect.right) - Math.max(point.x - radius, rect.left));
      const dy = Math.max(0, Math.min(point.y + radius, rect.bottom) - Math.max(point.y - radius, rect.top));
      area += dx * dy;
    }
    return Math.min(1, area / (4 * radius * radius));
  }
  function updateExposure(ball) { ball.node.classList.toggle('in-clear-space', coverage(ball, ball.radius) < .25); }
  function choosePosition(ball) {
    const columns = width >= 1000 ? 4 : width >= 600 ? 3 : 2;
    const rows = height >= 700 ? 4 : 3, top = Math.min(headerBottom + 12, height * .18);
    const cellWidth = width / columns, cellHeight = (height - top) / rows;
    const others = balls.filter(other => other !== ball && other.placed && !other.dismissed && active?.ball !== other);
    const occupancy = Array(columns * rows).fill(0);
    const sideOccupancy = [0, 0];
    others.forEach(other => {
      sideOccupancy[other.x < width / 2 ? 0 : 1]++;
      const column = clamp(Math.floor(other.x / cellWidth), 0, columns - 1);
      const row = clamp(Math.floor((other.y - top) / cellHeight), 0, rows - 1);
      occupancy[row * columns + column]++;
      if (other.goal) {
        sideOccupancy[other.goal.x < width / 2 ? 0 : 1] += .35;
        const goalColumn = clamp(Math.floor(other.goal.x / cellWidth), 0, columns - 1);
        const goalRow = clamp(Math.floor((other.goal.y - top) / cellHeight), 0, rows - 1);
        occupancy[goalRow * columns + goalColumn] += .75;
      }
    });
    let best = null, safest = null;
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
      for (let sample = 0; sample < 3; sample++) {
        const point = {
          x: clamp((column + .5) * cellWidth + random(-.26, .26) * cellWidth, ball.radius + 14, width - ball.radius - 14),
          y: clamp(top + (row + .5) * cellHeight + random(-.24, .24) * cellHeight, Math.min(top + ball.radius, height - ball.radius - 14), height - ball.radius - 14)
        };
        let clearance = Math.min(width, height);
        for (const other of others) clearance = Math.min(clearance, Math.hypot(other.x - point.x, other.y - point.y) - ball.radius - other.radius);
        const score = Math.min(clearance, 100) * .6 - occupancy[row * columns + column] * 170
          - sideOccupancy[point.x < width / 2 ? 0 : 1] * 180 - coverage(point, ball.radius) * 120 + random(0, 22);
        const candidate = { ...point, score };
        if (!best || score > best.score) best = candidate;
        if (clearance >= 12 && (!safest || score > safest.score)) safest = candidate;
      }
    }
    const result = safest || best;
    return { x: result.x, y: result.y };
  }
  function paintCloud(ball) {
    if (!ball.paint || ball.dismissed) return;
    const p = ball.paint, size = ball.radius * 2, turn = clock * .17 + ball.index;
    const rgb = palette[ball.skill.color], cos = Math.cos(turn), sin = Math.sin(turn);
    const tiltCos = Math.cos(.22), tiltSin = Math.sin(.22);
    p.clearRect(0, 0, size, size);
    ball.points.forEach(point => {
      const x = point.x * cos + point.z * sin;
      const z = point.z * cos - point.x * sin;
      const y = point.y * tiltCos - z * tiltSin;
      const scale = 1 + z * .12;
      const radius = ball.radius * .84;
      p.beginPath();
      p.arc(ball.radius + x * radius * scale, ball.radius + y * radius * scale, (.65 + (z + 1) * .5) * (width < 760 ? .8 : 1), 0, Math.PI * 2);
      p.fillStyle = `rgba(${rgb.join(',')},${.25 + (z + 1) * .32})`; p.fill();
    });
  }
  function dockPosition(ball) {
    const r = note.getBoundingClientRect();
    return { x: clamp(r.right - ball.radius - 12, ball.radius + 8, width - ball.radius - 8), y: clamp(r.top - ball.radius - 16, ball.radius + 8, height - ball.radius - 8) };
  }
  function hideNote() { note.classList.remove('visible', 'typing'); note.hidden = true; }
  function clearPortal() {
    if (!active?.portal) return;
    active.portal.surface.remove(); delete active.portal;
    select.disabled = false;
    active.ball.node.style.visibility = ''; active.ball.node.style.opacity = '';
    active.ball.node.style.transition = ''; active.ball.node.style.pointerEvents = '';
  }
  function release() {
    if (!active) return;
    const { ball, origin } = active;
    clearPortal();
    if (document.activeElement === ball.node) select.focus({ preventScroll: true });
    Object.assign(ball, origin); place(ball); root.append(ball.node);
    ball.node.tabIndex = -1; ball.node.classList.remove('visiting'); ball.turnAt = clock + random(3, 6);
    ball.node.setAttribute('aria-label', `查看 ${ball.skill.name} 技术说明`);
    ball.goal = null; updateExposure(ball);
    active = null; hideNote(); select.value = ''; nextVisit = clock + random(4, 7);
  }
  function showDescription(instant = false) {
    active.phase = 'describe'; active.started = clock;
    active.characters = Array.from(active.ball.skill.description);
    active.typingDuration = instant ? 0 : active.characters.length / CHARACTERS_PER_SECOND;
    text.textContent = instant ? active.ball.skill.description : '';
    note.classList.toggle('typing', !instant); note.classList.add('visible'); active.ball.node.tabIndex = 0;
    if (active.recycleRequested) recycle();
  }
  function visit(index) {
    if (active?.phase === 'portal') return;
    release();
    const ball = balls[index];
    if (!ball || ball.dismissed) return;
    document.querySelector('#skill-kind').textContent = ball.skill.kind;
    document.querySelector('#skill-title').textContent = ball.skill.name;
    // Reserve the final paragraph height so typing never moves the panel or return path.
    measure.textContent = ball.skill.description; text.textContent = ''; note.hidden = false;
    const origin = { x: ball.x, y: ball.y };
    foreground.append(ball.node); ball.node.classList.add('visiting'); previousIndex = ball.index;
    ball.node.setAttribute('aria-label', `回收 ${ball.skill.name} 技术球并关闭说明`);
    active = { ball, origin, destination: dockPosition(ball), started: clock, phase: 'approach' };
    if (paused || preference.matches) { Object.assign(ball, active.destination); place(ball); showDescription(true); }
  }
  function selectBall(ball) {
    if (ball.dismissed || modalOpen || active?.phase === 'portal') return;
    visit(ball.index); select.value = String(ball.index);
  }
  function beginPortal() {
    const ball = active.ball, surface = document.createElement('canvas');
    hideNote(); ball.node.tabIndex = -1; select.value = ''; select.disabled = true;
    if (document.activeElement === ball.node) select.focus({ preventScroll: true });
    surface.className = 'portal-flow'; surface.setAttribute('aria-hidden', 'true');
    foreground.append(surface); ball.node.style.visibility = 'hidden'; ball.node.style.pointerEvents = 'none';
    const turn = clock * .17 + ball.index;
    const count = width < 760 ? (ball.skill.size > 140 ? 48 : 32) : (ball.skill.size > 140 ? 72 : 48);
    const buckets = [[], [], []];
    // Evenly sample the original cloud; transfer needs fewer points than the resting sphere.
    const points = Array.from({ length: count }, (_, i) => {
      const point = ball.points[Math.floor(i * ball.points.length / count)];
      const x = point.x * Math.cos(turn) + point.z * Math.sin(turn);
      const z = point.z * Math.cos(turn) - point.x * Math.sin(turn);
      const y = point.y * Math.cos(.22) - z * Math.sin(.22);
      const projected = { x: x * .84 * (1 + z * .12), y: y * .84 * (1 + z * .12), z,
        delay: i / (count - 1) * DEPART_SPAN, renderX: 0, renderY: 0, visible: false,
        moving: false, tailX: 0, tailY: 0, hasTail: false };
      buckets[Math.min(2, Math.floor((z + 1) * 1.5))].push(projected);
      return projected;
    });
    active.phase = 'portal'; active.started = clock;
    active.portal = { surface, paint: surface.getContext('2d'), points, buckets, bounds: null,
      colors: [.24, .36, .48].map(alpha => `rgba(${palette[ball.skill.color].join(',')},${alpha})`),
      movingColors: [.6, .74, .88].map(alpha => `rgba(${palette[ball.skill.color].join(',')},${alpha})`),
      source: { x: ball.x, y: ball.y }, target: findReformSpot(ball), blending: false };
    resizePortal(); paintPortal(); start();
  }
  function resizePortal() {
    if (!active?.portal) return;
    const { surface } = active.portal;
    // Tiny moving dots need no high-DPI full-screen buffer.
    surface.width = Math.round(width); surface.height = Math.round(height); active.portal.bounds = null;
    active.portal.restingOpacity = Number(getComputedStyle(root).getPropertyValue('--orb-idle-opacity')) || .55;
    const target = active.portal.target, radius = active.ball.radius;
    target.x = clamp(target.x, radius + 12, width - radius - 12);
    target.y = clamp(target.y, radius + 12, height - radius - 12);
  }
  function paintPortal() {
    if (!active?.portal?.paint) return;
    const { ball, portal } = active, p = portal.paint, elapsed = clock - active.started;
    const origin = portal.source, target = formationPosition(ball);
    const intake = { x: width + 4, y: origin.y };
    if (portal.bounds) {
      const b = portal.bounds;
      p.clearRect(b.left - 18, b.top - 18, b.right - b.left + 36, b.bottom - b.top + 36);
    }
    const bounds = { left: width, top: height, right: 0, bottom: 0 };
    const curve = (a, b, c, d, t) => (1-t)**3*a + 3*(1-t)**2*t*b + 3*(1-t)*t*t*c + t**3*d;
    portal.points.forEach(point => {
      const wasVisible = point.visible, previousX = point.renderX, previousY = point.renderY;
      point.visible = false;
      point.hasTail = false;
      const endX = target.x + point.x * ball.radius, endY = target.y + point.y * ball.radius;
      let x, y;
      const age = elapsed - point.delay;
      point.moving = (age >= 0 && age < INTAKE_SECONDS) || (age >= EMIT_START && age < EMIT_START + EMIT_SECONDS);
      if (age < EMIT_START) {
        const startX = origin.x + point.x * ball.radius;
        const startY = origin.y + point.y * ball.radius;
        const t = ease(clamp(age / INTAKE_SECONDS, 0, 1));
        if (t === 1) return;
        // Keep the attraction curve inside the viewport until particles reach the right edge.
        x = curve(startX, Math.min(startX + 65, intake.x - 12), intake.x - 24, intake.x, t);
        y = curve(startY, startY + point.y * (preference.matches ? 12 : 36), intake.y + point.y * 8, intake.y, t);
      } else {
        const t = ease(clamp((age - EMIT_START) / EMIT_SECONDS, 0, 1));
        x = curve(target.x, target.x + point.x * ball.radius * 1.55, endX + point.x * 14, endX, t);
        y = curve(target.y, target.y + point.y * ball.radius * 1.55, endY + point.y * 14, endY, t);
      }
      if (x < -2 || x > width + 2 || y < -2 || y > height + 2) return;
      point.renderX = x; point.renderY = y; point.visible = true;
      const dx = x - previousX, dy = y - previousY, distance = Math.hypot(dx, dy);
      // Tails reuse the same particles and never join the two sides of the screen.
      if (!preference.matches && point.moving && wasVisible && distance > .3 && distance < ball.radius * 2) {
        const length = Math.min(14, Math.max(5, distance * 3));
        point.tailX = x - dx / distance * length; point.tailY = y - dy / distance * length; point.hasTail = true;
      }
      bounds.left = Math.min(bounds.left, x); bounds.top = Math.min(bounds.top, y);
      bounds.right = Math.max(bounds.right, x); bounds.bottom = Math.max(bounds.bottom, y);
    });
    const emitting = elapsed >= EMIT_START && elapsed <= DEPART_SPAN + EMIT_START + EMIT_SECONDS;
    if (emitting) {
      bounds.left = Math.min(bounds.left, target.x - 3); bounds.top = Math.min(bounds.top, target.y - 3);
      bounds.right = Math.max(bounds.right, target.x + 3); bounds.bottom = Math.max(bounds.bottom, target.y + 3);
    }
    portal.bounds = bounds.right >= bounds.left ? bounds : null;
    const blend = clamp((elapsed - (PORTAL_SECONDS - .32)) / .32, 0, 1);
    // Fade the sparse transfer into the normal cloud instead of switching density in one frame.
    if (blend > 0) {
      if (!portal.blending) {
        portal.blending = true; ball.node.style.visibility = ''; ball.node.style.transition = 'none'; paintCloud(ball);
      }
      Object.assign(ball, target); place(ball);
      ball.node.style.opacity = String(portal.restingOpacity * blend);
    }
    p.globalAlpha = 1 - blend;
    if (emitting) {
      p.beginPath(); p.arc(target.x, target.y, 1.8, 0, Math.PI * 2);
      p.fillStyle = portal.movingColors[2]; p.fill();
    }
    portal.buckets.forEach((bucket, i) => {
      const radius = (.7 + i * .22) * (width < 760 ? .85 : 1);
      p.beginPath();
      bucket.forEach(point => {
        if (!point.visible || !point.hasTail) return;
        p.moveTo(point.tailX, point.tailY); p.lineTo(point.renderX, point.renderY);
      });
      p.lineWidth = .8; p.strokeStyle = portal.colors[i]; p.stroke();
      p.beginPath();
      bucket.forEach(point => {
        if (!point.visible || point.moving) return;
        p.moveTo(point.renderX + radius, point.renderY); p.arc(point.renderX, point.renderY, radius, 0, Math.PI * 2);
      });
      p.fillStyle = portal.colors[i]; p.fill();
      const movingRadius = radius * 1.3;
      p.beginPath();
      bucket.forEach(point => {
        if (!point.visible || !point.moving) return;
        p.moveTo(point.renderX + movingRadius, point.renderY); p.arc(point.renderX, point.renderY, movingRadius, 0, Math.PI * 2);
      });
      p.fillStyle = portal.movingColors[i]; p.fill();
    });
    p.globalAlpha = 1;
  }
  function findReformSpot(ball) {
    return choosePosition(ball);
  }
  function formationPosition(ball) {
    return active?.ball === ball && active.portal ? active.portal.target : ball.reformAt;
  }
  function recycle() {
    beginPortal();
  }
  function finishRecycle() {
    const ball = active.ball;
    active.origin = formationPosition(ball); ball.reformAt = { ...active.origin };
    ball.vx = 48; ball.vy = random(-10, 10); ball.bounceUntil = clock + 4;
    release(); ball.turnAt = clock + 4;
    repelAtOutlet(ball, ball.radius);
    if (balls.some(ball => ball.bounceUntil > clock)) resolveCollisions();
    balls.forEach(place);
  }
  function repelAtOutlet(ball, radius) {
    const center = formationPosition(ball);
    balls.forEach(other => {
      if (other === ball || other.dismissed) return;
      const dx = other.x - center.x, dy = other.y - center.y, distance = Math.hypot(dx, dy);
      const overlap = radius + other.radius - distance;
      if (overlap <= 0) return;
      const nx = distance > .001 ? dx / distance : 1, ny = distance > .001 ? dy / distance : 0;
      other.x = clamp(other.x + nx * overlap, other.radius, width - other.radius);
      other.y = clamp(other.y + ny * overlap, other.radius, height - other.radius);
      // The growing cloud acts as a moving collision boundary; larger clouds have more mass.
      const relative = (other.vx - ball.vx) * nx + (other.vy - ball.vy) * ny;
      const impulse = 1.8 * Math.max(0, ball.radius / (DEPART_SPAN + EMIT_SECONDS) - relative) / (1 / ball.radius**2 + 1 / other.radius**2);
      other.vx += impulse / other.radius**2 * nx; other.vy += impulse / other.radius**2 * ny;
      other.bounceUntil = clock + 4; other.turnAt = clock + 4; place(other);
    });
  }
  function resolveCollisions() {
    // Only recently emitted or hit clouds need collision checks; ordinary drift stays unchanged.
    const free = balls.filter(ball => !ball.dismissed && active?.ball !== ball);
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < free.length; i++) for (let j = i + 1; j < free.length; j++) {
      const a = free[i], b = free[j];
      if (!(a.bounceUntil > clock || b.bounceUntil > clock)) continue;
      const dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy), overlap = a.radius + b.radius - distance;
      if (overlap <= 0) continue;
      const nx = distance > .001 ? dx / distance : 1, ny = distance > .001 ? dy / distance : 0;
      const invA = 1 / a.radius**2, invB = 1 / b.radius**2, sum = invA + invB;
      a.x = clamp(a.x - nx * overlap * invA / sum, a.radius, width - a.radius);
      a.y = clamp(a.y - ny * overlap * invA / sum, a.radius, height - a.radius);
      b.x = clamp(b.x + nx * overlap * invB / sum, b.radius, width - b.radius);
      b.y = clamp(b.y + ny * overlap * invB / sum, b.radius, height - b.radius);
      const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (relative < 0) {
        const impulse = -1.8 * relative / sum;
        a.vx -= impulse * invA * nx; a.vy -= impulse * invA * ny;
        b.vx += impulse * invB * nx; b.vy += impulse * invB * ny;
      }
      a.bounceUntil = b.bounceUntil = clock + 4; a.turnAt = b.turnAt = clock + 4;
    }
  }
  function beginReturn() {
    if (document.activeElement === active.ball.node) select.focus({ preventScroll: true });
    hideNote(); active.phase = 'return'; active.started = clock; active.ball.node.tabIndex = -1; select.value = '';
  }
  function resize() {
    const oldWidth = width, oldHeight = height;
    width = innerWidth; height = innerHeight;
    const scale = width <= 760 ? .68 : 1.15, ratio = Math.min(devicePixelRatio || 1, 2);
    balls.forEach(ball => {
      ball.radius = ball.skill.size * scale / 2;
      ball.node.style.width = `${ball.radius * 2}px`; ball.node.style.height = `${ball.radius * 2}px`;
      ball.surface.width = Math.round(ball.radius * 2 * ratio); ball.surface.height = Math.round(ball.radius * 2 * ratio);
      if (ball.paint) ball.paint.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (ball.placed && active?.ball !== ball) { ball.x *= width / oldWidth; ball.y *= height / oldHeight; }
      ball.x = clamp(ball.x, ball.radius, width - ball.radius); ball.y = clamp(ball.y, ball.radius, height - ball.radius);
    });
    refreshRegions();
    balls.forEach(ball => {
      if (!ball.placed) { Object.assign(ball, choosePosition(ball)); ball.placed = true; }
      updateExposure(ball); place(ball); paintCloud(ball);
    });
    if (active) {
      active.origin.x = clamp(active.origin.x, active.ball.radius, width - active.ball.radius);
      active.origin.y = clamp(active.origin.y, active.ball.radius, height - active.ball.radius);
      if (active.phase !== 'return') {
        active.destination = dockPosition(active.ball);
        if (active.phase !== 'portal') { Object.assign(active.ball, active.destination); place(active.ball); }
        if (active.phase === 'approach') showDescription(paused || preference.matches);
      }
    }
    resizePortal();
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    if (ctx) ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    particles = Array.from({ length: width < 760 ? 24 : 45 }, () => ({ x: random(0, width), y: random(0, height), vx: random(-4, 4), vy: random(-4, 4) }));
    drawParticles(0);
  }
  function drawParticles(dt) {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => {
      p.x = (p.x + p.vx * dt + width) % width; p.y = (p.y + p.vy * dt + height) % height;
      ctx.beginPath(); ctx.arc(p.x, p.y, 1, 0, Math.PI * 2); ctx.fillStyle = '#638a7c55'; ctx.fill();
    });
    for (let i = 0; i < particles.length; i++) for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i], b = particles[j], distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (distance > 120) continue;
      ctx.strokeStyle = `rgba(90,135,120,${(1 - distance / 120) * .08})`;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }
  function tick(time) {
    frame = 0;
    if ((paused && active?.phase !== 'portal') || modalOpen || document.hidden) return;
    const dt = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, .05);
    lastTime = time; clock += dt;
    if (!paused) balls.forEach(ball => {
      if (ball.dismissed || active?.ball === ball) return;
      if (!(ball.bounceUntil > clock)) {
        if (!ball.goal || clock >= ball.turnAt || Math.hypot(ball.goal.x - ball.x, ball.goal.y - ball.y) < 24) {
          ball.goal = choosePosition(ball); ball.turnAt = clock + random(18, 28);
        }
        const dx = ball.goal.x - ball.x, dy = ball.goal.y - ball.y, distance = Math.hypot(dx, dy);
        const speed = Math.min(24, distance * .25), steer = Math.min(1, dt * 1.2);
        if (distance > 1) { ball.vx += (dx / distance * speed - ball.vx) * steer; ball.vy += (dy / distance * speed - ball.vy) * steer; }
        // A soft separation force keeps drifting clouds from accumulating in one spot.
        for (const other of balls) {
          if (other === ball || active?.ball === other || other.dismissed) continue;
          const sx = ball.x - other.x, sy = ball.y - other.y, gap = Math.hypot(sx, sy), limit = ball.radius + other.radius + 18;
          if (gap > .1 && gap < limit) { const force = (1 - gap / limit) * 32 * dt; ball.vx += sx / gap * force; ball.vy += sy / gap * force; }
        }
      }
      if (ball.bounceUntil > clock) { const drag = Math.exp(-.7 * dt); ball.vx *= drag; ball.vy *= drag; }
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.x < ball.radius || ball.x > width - ball.radius) ball.vx *= -1;
      if (ball.y < ball.radius || ball.y > height - ball.radius) ball.vy *= -1;
      ball.x = clamp(ball.x, ball.radius, width - ball.radius); ball.y = clamp(ball.y, ball.radius, height - ball.radius); place(ball);
    });
    if (!paused && !active && clock >= nextVisit) {
      const available = balls.filter(ball => !ball.dismissed), candidates = available.filter(ball => ball.index !== previousIndex);
      const pool = candidates.length ? candidates : available;
      if (pool.length) visit(pool[Math.floor(Math.random() * pool.length)].index); else nextVisit = clock + 10;
    }
    if (active) {
      const elapsed = clock - active.started;
      if (active.phase === 'portal') {
        if (elapsed >= PORTAL_SECONDS) {
          finishRecycle();
        } else if (elapsed > EMIT_START) {
          repelAtOutlet(active.ball, active.ball.radius * clamp((elapsed - EMIT_START) / (DEPART_SPAN + EMIT_SECONDS), 0, 1));
        }
      } else if (active.phase === 'approach' || active.phase === 'return') {
        const progress = Math.min(elapsed / TRAVEL_SECONDS, 1), factor = ease(active.phase === 'return' ? 1 - progress : progress);
        active.ball.x = active.origin.x + (active.destination.x - active.origin.x) * factor;
        active.ball.y = active.origin.y + (active.destination.y - active.origin.y) * factor;
        if (progress === 1) { if (active.phase === 'approach') showDescription(); else release(); }
      } else {
        const length = Math.min(Math.floor(elapsed * CHARACTERS_PER_SECOND), active.characters.length);
        text.textContent = active.characters.slice(0, active.typingDuration ? length : active.characters.length).join('');
        note.classList.toggle('typing', elapsed < active.typingDuration);
        if (elapsed >= active.typingDuration + DISPLAY_SECONDS) beginReturn();
      }
      if (active) place(active.ball);
    }
    if (balls.some(ball => ball.bounceUntil > clock)) resolveCollisions();
    balls.forEach(place);
    if (!paused) drawParticles(dt);
    if (paintCounter++ % 3 === 0) balls.forEach(ball => {
      const overlaps = active && active.ball !== ball && Math.hypot(ball.x - active.ball.x, ball.y - active.ball.y) < ball.radius + active.ball.radius + 12;
      ball.node.classList.toggle('occluded', Boolean(overlaps));
      updateExposure(ball);
      if (!paused && !(active?.ball === ball && active.phase === 'portal')) paintCloud(ball);
    });
    if (active?.phase === 'portal') paintPortal();
    if (!paused || active?.phase === 'portal') frame = requestAnimationFrame(tick);
  }
  function start() { if ((!paused || active?.phase === 'portal') && !modalOpen && !document.hidden && !frame) { lastTime = null; frame = requestAnimationFrame(tick); } }
  function setPaused(value) {
    paused = value; toggle.setAttribute('aria-pressed', String(value)); toggle.textContent = value ? '播放背景 ▷' : '暂停背景 Ⅱ';
    if (value) {
      cancelAnimationFrame(frame); frame = 0;
      if (active?.phase === 'portal') start();
      else if (active?.phase === 'approach') { Object.assign(active.ball, active.destination); place(active.ball); showDescription(true); }
      else if (active?.phase === 'describe') { text.textContent = active.ball.skill.description; note.classList.remove('typing'); active.typingDuration = 0; active.started = clock; }
    } else start();
  }
  select.addEventListener('change', () => {
    if (active?.phase === 'portal') { select.value = ''; return; }
    if (select.value !== '') visit(Number(select.value)); else { release(); nextVisit = clock + 1; }
  });
  // Content sits above the background. Resolve clicks by coordinates without covering links or controls.
  document.addEventListener('click', event => {
    if (modalOpen || event.defaultPrevented || event.target.closest('a,button,input,select,textarea,dialog,[role="button"],.query-demo') || window.getSelection()?.toString()) return;
    const hit = balls.filter(ball => !ball.dismissed && active?.ball !== ball && !ball.node.classList.contains('occluded'))
      .map(ball => ({ ball, distance: Math.hypot(event.clientX - ball.x, event.clientY - ball.y) / (ball.radius + 10) }))
      .filter(hit => hit.distance <= 1).sort((a, b) => a.distance - b.distance)[0];
    if (hit) selectBall(hit.ball);
  });
  toggle.addEventListener('click', () => setPaused(!paused));
  preference.addEventListener('change', event => setPaused(event.matches));
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else start(); });
  document.addEventListener('project-detail-state', event => {
    modalOpen = event.detail;
    if (modalOpen) { cancelAnimationFrame(frame); frame = 0; } else start();
  });
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', () => { if (!regionFrame) regionFrame = requestAnimationFrame(refreshRegions); }, { passive: true });
  resize(); setPaused(paused);
})();
