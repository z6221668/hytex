const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { createGazeFilter } = require('../gaze-filter.js');

// Replay gaze traces without opening a camera or depending on inference speed.
function setup(room) {
  let now = 1000;
  let covered = false;
  const controls = [];
  let modal = null;
  const scrollCalls = [];
  class Element {
    constructor() {
      this.style = { setProperty() {} };
      this.children = new Map();
      this.classList = { add() {}, remove() {}, toggle() {} };
      this.isConnected = true;
    }
    setAttribute() {}
    addEventListener() {}
    append(child) { child.parentNode = this; }
    querySelector(key) {
      if (!this.children.has(key)) this.children.set(key, new Element());
      return this.children.get(key);
    }
    closest(selector) { return selector.startsWith('button,') && this.isButton ? this : selector === 'dialog[open]' && this.isModal ? this : null; }
    matches() { return false; }
  }
  const viewport = new Element();
  viewport.scrollHeight = 3000; viewport.clientHeight = 800; viewport.scrollTop = 600;
  viewport.getClientRects = () => [{}];
  viewport.scrollBy = options => { scrollCalls.push(options); viewport.scrollTop += options.top; };
  const document = {
    querySelectorAll: () => modal ? [modal] : [], getElementById: () => viewport,
    body: new Element(), createElement: () => new Element(), addEventListener() {},
    elementFromPoint(x, y) {
      if (covered) return null;
      return controls.find(el => x >= el.rect.left && x <= el.rect.right && y >= el.rect.top && y <= el.rect.bottom) || modal;
    }
  };
  const context = {
    document, window: { createGazeFilter, HYTEX_ROOM: room, addEventListener() {} }, location: { origin: 'http://localhost' },
    innerWidth: 1000, innerHeight: 800, getComputedStyle: () => ({ overflowY: 'auto' }),
    matchMedia: () => ({ matches: false }), performance: { now: () => now },
    requestAnimationFrame: () => 1, cancelAnimationFrame() {}, setTimeout, clearTimeout
  };
  let source = fs.readFileSync(path.join(__dirname, '../gaze-glow.js'), 'utf8');
  // Expose closures only inside this isolated test context, never on the production page.
  source = source.replace(/\}\)\(\);\s*$/, `globalThis.api = {
    filterGaze, updateDwell, pauseDwell, resetDwell, updateEdgeScroll, resetEdge,
    snapshot: () => ({ elapsed: dwellElapsed, locked: !!dwellTarget, paused: outsideSince !== null, visual: visualTarget && { ...visualTarget }, region: dwellRegion && { ...dwellRegion } })
  }; })();`);
  vm.runInNewContext(source, context);
  const api = context.api;
  return {
    api, viewport, scrollCalls,
    edge(y, dt = 100) { now += dt; return api.updateEdgeScroll(500, y, { x: 500, y }, now); },
    openModal() {
      modal = new Element(); modal.isModal = true; modal.contains = el => el === modal;
      modal.scrollHeight = 1600; modal.clientHeight = 600; modal.scrollTop = 0;
      modal.scrollBy = options => { scrollCalls.push({ ...options, modal: true }); modal.scrollTop += options.top; };
      return modal;
    },
    button(left = 450, top = 385, width = 100, height = 30) {
      const el = new Element(); el.isButton = true;
      el.rect = { left, top, right: left + width, bottom: top + height, width, height };
      el.getBoundingClientRect = () => el.rect;
      el.clicks = 0; el.click = () => el.clicks++;
      controls.push(el); return el;
    },
    gaze(x = 500, y = 400, dt = 100) {
      now += dt;
      const filtered = api.filterGaze(x, y, now);
      api.updateDwell(x, y, filtered, now);
    },
    missing(dt = 100) { now += dt; api.pauseDwell(now); },
    cover() { covered = true; },
    filter(x, y, dt = 50) { now += dt; return api.filterGaze(x, y, now); }
  };
}

function lock(env) { for (let i = 0; i < 8; i++) env.gaze(); }

test('small button tolerates head/eye motion outside its literal hit box', () => {
  const env = setup(), button = env.button();
  lock(env);
  assert.ok(env.api.snapshot().region.bottom - env.api.snapshot().region.top >= 112);
  // +/- 30px vertical movement is outside this 30px-high button, but inside its tolerance box.
  for (let i = 0; i < 60; i++) env.gaze(500 + (i % 2 ? 25 : -25), 400 + (i % 2 ? 30 : -30));
  assert.equal(button.clicks, 1);
  for (let i = 0; i < 80; i++) env.gaze(500 + (i % 2 ? 25 : -25), 400 + (i % 2 ? 30 : -30));
  assert.equal(button.clicks, 1, 'micro-movements must not re-arm a clicked control');
});

test('blink pauses progress, recovery keeps it, extended loss cancels it', () => {
  const env = setup(); env.button(); lock(env);
  const elapsed = env.api.snapshot().elapsed;
  for (let i = 0; i < 4; i++) env.missing();
  assert.equal(env.api.snapshot().elapsed, elapsed);
  env.gaze();
  assert.equal(env.api.snapshot().elapsed, elapsed, 'missing interval must never be counted');
  env.gaze();
  assert.ok(env.api.snapshot().elapsed > elapsed);
  for (let i = 0; i < 11; i++) env.missing();
  assert.equal(env.api.snapshot().locked, false);
});

test('neighboring control pauses old target instead of counting toward an incorrect click', () => {
  const env = setup(), first = env.button(), second = env.button(550, 385, 100, 30);
  lock(env); const elapsed = env.api.snapshot().elapsed;
  for (let i = 0; i < 4; i++) env.gaze(555, 400);
  assert.equal(env.api.snapshot().elapsed, elapsed);
  assert.equal(first.clicks, 0); assert.equal(second.clicks, 0);
  for (let i = 0; i < 12; i++) env.gaze(610, 400);
  assert.equal(first.clicks, 0);
});

test('looking away just before completion never clicks through filter lag', () => {
  const env = setup(), button = env.button(); lock(env);
  while (env.api.snapshot().elapsed < 1200) env.gaze();
  for (let i = 0; i < 15; i++) env.gaze(900, 700);
  assert.equal(button.clicks, 0);
  assert.equal(env.api.snapshot().locked, false);
});

test('new overlay cancels a previously locked button', () => {
  const env = setup(), button = env.button(); lock(env);
  env.cover(); env.gaze();
  assert.equal(env.api.snapshot().locked, false);
  assert.equal(button.clicks, 0);
});

test('halo stays anchored under noise but follows a sustained deliberate move', () => {
  const env = setup();
  for (let i = 0; i < 12; i++) env.filter(500, 400);
  const initial = env.api.snapshot().visual;
  for (let i = 0; i < 40; i++) env.filter(500 + (i % 2 ? 35 : -35), 400 + (i % 2 ? 25 : -25));
  assert.deepEqual(env.api.snapshot().visual, initial);
  env.filter(950, 750);
  assert.deepEqual(env.api.snapshot().visual, initial);
  for (let i = 0; i < 35; i++) env.filter(760, 600);
  assert.ok(env.api.snapshot().visual.x > 700);
});


test('click threshold is 1.5s of valid dwell, not before', () => {
  const env = setup(), button = env.button(); lock(env);
  while (env.api.snapshot().elapsed < 1400) env.gaze();
  assert.equal(button.clicks, 0);
  env.gaze(); assert.equal(button.clicks, 1);
});

test('bottom dwell scrolls once and remains latched across resulting scroll events', () => {
  const env = setup(); env.edge(770);
  for (let i = 0; i < 14; i++) env.edge(770);
  assert.equal(env.scrollCalls.length, 0);
  env.edge(770); assert.equal(env.scrollCalls.length, 1);
  assert.equal(env.scrollCalls[0].top, 480);
  env.api.resetEdge(); // native scroll event must not clear the one-shot latch
  for (let i = 0; i < 40; i++) env.edge(770);
  assert.equal(env.scrollCalls.length, 1);
  for (let i = 0; i < 7; i++) env.edge(400);
  for (let i = 0; i < 17; i++) env.edge(770);
  assert.equal(env.scrollCalls.length, 2);
});

test('top dwell scrolls upward and looking away cancels pending scroll', () => {
  const env = setup(); env.edge(20);
  for (let i = 0; i < 12; i++) env.edge(20);
  env.edge(400); assert.equal(env.scrollCalls.length, 0);
  for (let i = 0; i < 16; i++) env.edge(20);
  assert.equal(env.scrollCalls.length, 1);
  assert.equal(env.scrollCalls[0].top, -480);
});

test('edge buttons take precedence over scrolling', () => {
  const env = setup(); env.button(450, 740, 100, 50);
  for (let i = 0; i < 30; i++) env.edge(770);
  assert.equal(env.scrollCalls.length, 0);
});

test('modal scroll is isolated and its boundary does not scroll the page behind it', () => {
  const env = setup(), modal = env.openModal();
  for (let i = 0; i < 16; i++) env.edge(770);
  assert.equal(env.scrollCalls.length, 1);
  assert.equal(env.scrollCalls[0].modal, true);
  assert.equal(env.viewport.scrollTop, 600);
  env.api.resetEdge(true); modal.scrollTop = 1000;
  for (let i = 0; i < 30; i++) env.edge(770);
  assert.equal(env.scrollCalls.length, 1);
});

// A click may replace its button with another control at the same coordinates.
test('replacement control requires looking away after a click', () => {
  const env = setup(), first = env.button();
  for (let i = 0; i < 20; i++) env.gaze();
  assert.equal(first.clicks, 1);
  first.rect = { left: 0, top: 0, right: 0, bottom: 0 };
  const replacement = env.button();
  for (let i = 0; i < 30; i++) env.gaze();
  assert.equal(replacement.clicks, 0);
  for (let i = 0; i < 20; i++) env.gaze(900, 700);
  for (let i = 0; i < 25; i++) env.gaze();
  assert.equal(replacement.clicks, 1);
});

test('gaze edge navigation turns one whole exhibition page', () => {
  let page = 2;
  const env = setup({ state: {}, canNavigate: direction => page + direction >= 0 && page + direction <= 6, navigate: direction => { page += direction; } });
  for (let i = 0; i < 40; i++) env.edge(770);
  assert.equal(page, 3);
  assert.equal(env.scrollCalls.length, 0, 'page navigation must not also issue pixel scrolling');
  for (let i = 0; i < 7; i++) env.edge(400);
  for (let i = 0; i < 17; i++) env.edge(20);
  assert.equal(page, 2);
});
