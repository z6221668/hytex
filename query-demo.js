/* The shared time axis illustrates overlap only; these durations are not benchmarks. */
(() => {
  'use strict';
  const root = document.querySelector('#query-demo');
  const play = document.querySelector('#query-play');
  const replay = document.querySelector('#query-replay');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const tracks = [...root.querySelectorAll('.query-track')].map(node => ({
    node, tasks: [...node.querySelectorAll('.query-task')],
    result: node.querySelector('.query-result'), label: node.querySelector('.query-result-label'),
    ranges: node.dataset.mode === 'serial' ? [[0, 1.8], [1.8, 4], [4, 5.8]] : [[0, 1.8], [0, 2.2], [0, 1.8]]
  }));
  let elapsed = 0, last = null, frame = null, visible = false;
  let paused = motion.matches, dialogOpen = false;
  function render(time, overview = false) {
    root.classList.toggle('is-animated', !overview);
    tracks.forEach(track => {
      track.tasks.forEach((task, i) => {
        const [start, end] = track.ranges[i];
        const progress = overview ? 1 : Math.max(0, Math.min(1, (time - start) / (end - start)));
        task.querySelector('i').style.transform = `scaleX(${progress})`;
        task.classList.toggle('is-running', !overview && time >= start && time < end);
        task.classList.toggle('is-done', progress === 1);
        task.querySelector('span').textContent = progress === 1 ? '完成' : '查询';
      });
      const done = overview || time >= Math.max(...track.ranges.map(range => range[1]));
      track.result.classList.toggle('is-complete', done);
      track.label.textContent = done ? '汇总返回' : '等待查询结果';
    });
  }
  function tick(now) {
    if (last !== null) elapsed += Math.min((now - last) / 1000, .1);
    last = now;
    if (elapsed > 8.2) elapsed = 0;
    render(elapsed);
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null; last = null;
    play.textContent = paused ? '播放演示 ▶' : '暂停演示 Ⅱ';
    play.setAttribute('aria-pressed', String(paused));
    if (!paused && visible && !document.hidden && !dialogOpen) frame = requestAnimationFrame(tick);
  }
  play.addEventListener('click', () => { paused = !paused; sync(); });
  replay.addEventListener('click', () => {
    elapsed = 0;
    paused = motion.matches;
    render(0, motion.matches); sync();
  });
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, { threshold: .1 }).observe(root);
  document.addEventListener('visibilitychange', sync);
  document.addEventListener('project-detail-state', event => { dialogOpen = event.detail; sync(); });
  motion.addEventListener('change', () => { paused = motion.matches; elapsed = 0; render(0, motion.matches); sync(); });
  render(0, motion.matches); sync();
})();
