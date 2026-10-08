const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createPageGesture } = require('../page-gesture.js');

test('a long trackpad gesture including momentum turns only one page', () => {
  const gesture = createPageGesture();
  const turns = [];
  for (let now = 0; now < 2400; now += 20) {
    const direction = gesture.wheel(now < 200 ? 20 : 3, now);
    if (direction) turns.push(direction);
  }
  assert.deepEqual(turns, [1]);
  assert.equal(gesture.wheel(80, 2700), 1);
});

test('small movements and rapid reversal cannot flash through pages', () => {
  const gesture = createPageGesture();
  assert.equal(gesture.wheel(12, 0), 0);
  assert.equal(gesture.wheel(-12, 20), 0);
  assert.equal(gesture.wheel(-60, 40), -1);
  assert.equal(gesture.wheel(100, 80), 0);
  assert.equal(gesture.wheel(100, 600), 1);
});

test('reset clears momentum when leaving and reentering the exhibition', () => {
  const gesture = createPageGesture();
  assert.equal(gesture.wheel(100, 0), 1);
  assert.equal(gesture.wheel(100, 20), 0);
  gesture.reset();
  assert.equal(gesture.wheel(-80, 40), -1);
});
