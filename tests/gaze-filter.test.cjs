const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createGazeFilter } = require('../gaze-filter.js');
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function settled(fps = 30) {
  const filter = createGazeFilter();
  let now = 0;
  for (let i = 0; i < fps; i++) { now += 1000 / fps; filter.update(400, 300, now); }
  return { filter, now };
}

test('stationary noisy gaze is stable without accumulating drift', () => {
  const { filter, now } = settled();
  let rawEnergy = 0, outputEnergy = 0, samples = 0;
  for (let i = 1; i <= 300; i++) {
    const raw = { x: 400 + 28 * Math.sin(i * 2.1) + 8 * Math.sin(i * .37), y: 300 + 24 * Math.cos(i * 1.7) };
    const output = filter.update(raw.x, raw.y, now + i * 1000 / 30);
    rawEnergy += distance(raw, { x: 400, y: 300 }) ** 2;
    outputEnergy += distance(output, { x: 400, y: 300 }) ** 2;
    samples++;
  }
  const inputRms = Math.sqrt(rawEnergy / samples), outputRms = Math.sqrt(outputEnergy / samples);
  assert.ok(outputRms < inputRms * .45, `RMS ${outputRms.toFixed(2)} vs input ${inputRms.toFixed(2)}`);
});

test('one isolated far-away frame cannot move the halo', () => {
  const { filter, now } = settled();
  const before = filter.update(400, 300, now + 33);
  assert.deepEqual(filter.update(950, 700, now + 66), before);
  assert.deepEqual(filter.update(400, 300, now + 99), before);
});

for (const fps of [10, 15, 30, 60]) {
  test(`large intentional gaze move reaches 90% promptly at ${fps}fps`, () => {
    const { filter, now } = settled(fps);
    let elapsed = 0;
    while (elapsed < 1000) {
      elapsed += 1000 / fps;
      const result = filter.update(750, 550, now + elapsed);
      if (distance(result, { x: 750, y: 550 }) <= Math.hypot(350, 250) * .1) break;
    }
    assert.ok(elapsed <= 1000 / fps + 150, `90% response took ${elapsed.toFixed(1)}ms`);
  });
}

test('continuous gaze travel follows instead of perpetually restarting a confirmation timer', () => {
  const { filter, now } = settled();
  let last;
  for (let i = 1; i <= 60; i++) last = filter.update(400 + i * 5, 300, now + i * 1000 / 30);
  assert.ok(700 - last.x < 55, `ramp lag ${700 - last.x}px`);
});

test('invalid and out-of-order predictions cannot poison filter state', () => {
  const { filter, now } = settled();
  const value = filter.update(400, 300, now + 33);
  assert.deepEqual(filter.update(NaN, 20, now + 50), value);
  assert.deepEqual(filter.update(900, 700, now), value);
  assert.deepEqual(filter.update(900, 700, now + 33), value);
  filter.reset();
  assert.deepEqual(filter.update(800, 500, now + 100), { x: 800, y: 500 });
});
