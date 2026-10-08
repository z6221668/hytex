(() => {
  'use strict';
  // A trackpad's momentum belongs to the same gesture, even after a page changes.
  function createPageGesture() {
    let lastTime = -Infinity, direction = 0, distance = 0, used = false, blockedUntil = 0;
    return {
      reset() { lastTime = -Infinity; direction = 0; distance = 0; used = false; blockedUntil = 0; },
      wheel(delta, now) {
        if (!Number.isFinite(delta) || !Number.isFinite(now) || !delta) return 0;
        const nextDirection = Math.sign(delta);
        if (now - lastTime > 180 || nextDirection !== direction) { distance = 0; used = false; }
        lastTime = now; direction = nextDirection;
        if (used || now < blockedUntil) return 0;
        distance += Math.abs(delta);
        if (distance < 60) return 0;
        used = true; blockedUntil = now + 450;
        return direction;
      }
    };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { createPageGesture };
  else window.createPageGesture = createPageGesture;
})();
