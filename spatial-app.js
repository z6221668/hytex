'use strict';
(() => {
  const data = window.RESUME;
  const chapters = [...document.querySelectorAll('[data-chapter]')];
  const dialog = document.querySelector('#project-dialog');
  const state = { chapter: 0, skill: 1, project: 0, filter: 'all', paused: matchMedia('(prefers-reduced-motion: reduce)').matches };
  let opener = null, typingFrame = 0, typingStarted = 0, typingText = '', scrolling = false;
  const dispatch = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));
  const el = (tag, className, value) => { const n = document.createElement(tag); n.className = className; if (value !== undefined) n.textContent = value; return n; };
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
    opener = source;
    selectProject(index);
    const p = data.projects[index];
    for (const [id, value] of Object.entries({ 'dialog-category': p.label, 'dialog-title': p.title, 'dialog-period': p.period, 'dialog-summary': p.summary })) document.getElementById(id).textContent = value;
    document.querySelector('#dialog-tags').replaceChildren(...p.tags.map(t => el('span', '', t)));
    document.querySelector('#dialog-work').replaceChildren(...p.details.map(t => el('li', '', t)));
    dialog.showModal(); dialog.scrollTop = 0; document.body.classList.add('dialog-open'); dispatch('spatial-modal', true);
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
    row.append(el('p', '', job.period), el('h3', '', job.company), el('p', 'role', job.role), el('p', 'description', job.description));
    row.addEventListener('pointerenter', () => dispatch('spatial-select-career', { index })); row.addEventListener('focus', () => dispatch('spatial-select-career', { index }));
    document.querySelector('#career-list').append(row);
  });
  dialog.addEventListener('close', () => { document.body.classList.remove('dialog-open'); dispatch('spatial-modal', false); if (opener?.isConnected) opener.focus({ preventScroll: true }); });
  dialog.addEventListener('click', event => { if (event.target !== dialog) return; const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); });
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
  const captions = [ ['BACKEND / AI / PRODUCT', 'Java 后端 · AI 应用 · 跨端开发'], ['JAVA / SPRING / DATA', '点击节点查看技术实践'], ['PROJECT ARCHIVE', '项目描述与负责的工作'], ['2018 — 2026', 'Java 后端开发经历'], ['PARALLEL QUERY', '独立查询，同时执行'], ['KEEP IN TOUCH', '68449317@qq.com'] ];
  function updateChapter() {
    scrolling = false;
    const probe = innerWidth <= 700 ? 240 : innerHeight * .45;
    let nearest = 0;
    chapters.forEach((s, i) => { if (s.getBoundingClientRect().top <= probe) nearest = i; });
    if (nearest !== state.chapter || !document.body.dataset.chapter) {
      state.chapter = nearest; document.body.dataset.chapter = nearest;
      document.querySelectorAll('.chapter-rail a').forEach((a, i) => { a.classList.toggle('active', i === nearest); if (i === nearest) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
      document.querySelectorAll('.header nav a').forEach(a => a.classList.toggle('active', a.hash === `#${chapters[nearest].id}`));
      document.querySelector('#scene-caption-kicker').textContent = captions[nearest][0]; document.querySelector('#scene-caption-title').textContent = nearest === 2 ? data.projects[state.project].title : captions[nearest][1];
      document.querySelector('.archive-controls').classList.toggle('visible', nearest === 2);
      dispatch('spatial-chapter', { index: nearest });
    }
    dispatch('spatial-scroll', { progress: Math.min(1, Math.max(0, -chapters[nearest].getBoundingClientRect().top / Math.max(1, chapters[nearest].offsetHeight - innerHeight * .3))) });
  }
  window.addEventListener('scroll', () => { if (!scrolling) { scrolling = true; requestAnimationFrame(updateChapter); } }, { passive: true }); window.addEventListener('resize', updateChapter);
  document.addEventListener('spatial-pick-skill', e => selectSkill(e.detail.index));
  document.addEventListener('spatial-skill-released', () => { cancelAnimationFrame(typingFrame); document.querySelector('#skill-reading').classList.remove('typing'); document.querySelector('#skill-reading').classList.add('released'); document.querySelector('#skill-description').textContent = '点击技术名称查看说明。'; });
  document.addEventListener('spatial-skill-arrived', e => { if (e.detail.index === state.skill) typeDescription(matchMedia('(prefers-reduced-motion: reduce)').matches); });
  document.addEventListener('spatial-pick-project', e => showProject(e.detail.index, document.querySelector('#archive-open')));
  document.addEventListener('spatial-select-project', e => { if (state.chapter === 2) document.querySelector('#scene-caption-title').textContent = data.projects[e.detail.index].title; });
  document.addEventListener('spatial-renderer-fallback', () => { window.HYTEX_SCENE_READY = false; document.body.classList.add('no-webgl'); typeDescription(true); });
  window.HYTEX_SPATIAL = { state, selectSkill, selectProject, showProject };
  updateChapter();
})();
