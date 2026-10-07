(() => {
  'use strict';
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const median = values => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];

  function createGazeFilter() {
    let history = [], position = null, anchor = null, previous = null;
    let lastTime = null, quietSince = 0, moving = false, candidate = null;
    return {
      reset() {
        history = []; position = anchor = previous = candidate = null;
        lastTime = null; quietSince = 0; moving = false;
      },
      update(x, y, now) {
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(now)) return position && { ...position };
        if (lastTime !== null && now <= lastTime) return { ...position };
        const dt = lastTime === null ? 16 : Math.min(200, now - lastTime);
        if (lastTime !== null && now - lastTime > 300) history = [];
        lastTime = now;
        history = history.filter(sample => now - sample.time <= 300);
        history.push({ x, y, time: now });
        if (history.length > 9) history.shift();
        // Three recent samples reject single-frame spikes without a long history delay.
        const recent = history.slice(-3);
        const observation = { x: median(recent.map(p => p.x)), y: median(recent.map(p => p.y)) };
        if (!position) {
          position = { ...observation }; anchor = { ...position }; previous = observation; quietSince = now;
          return { ...position };
        }
        const deviations = history.map(p => distance(p, observation)).filter(d => d < 90);
        const noise = deviations.length ? median(deviations) : 0;
        const holdRadius = Math.max(18, Math.min(44, noise * 1.4));
        const displacement = distance(observation, anchor);
        if (!moving) {
          if (displacement <= holdRadius) {
            candidate = null; previous = observation;
            return { ...position };
          }
          // Large median-confirmed changes are immediate; small relocations need one confirmation.
          if (displacement < 80 && (!candidate || distance(candidate, observation) > 36)) {
            candidate = observation; previous = observation;
            return { ...position };
          }
          moving = true; quietSince = now; candidate = null;
        }
        if (distance(observation, previous) > holdRadius) quietSince = now;
        const remaining = distance(observation, position);
        const tau = remaining > holdRadius ? 40 : 90;
        const alpha = 1 - Math.exp(-dt / tau);
        position = { x: position.x + (observation.x - position.x) * alpha, y: position.y + (observation.y - position.y) * alpha };
        if (now - quietSince >= 140 && distance(observation, position) <= holdRadius) {
          moving = false; anchor = { ...position };
        }
        previous = observation;
        return { ...position };
      }
    };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { createGazeFilter };
  else window.createGazeFilter = createGazeFilter;
})();
