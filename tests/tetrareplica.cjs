// Run with: node --test tests/tetrareplica.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../juegos/Tetris/tetrareplica/tetrareplica-core.js');

const { COLS, ROWS } = core;
const targetOf = (heights) => core.makeTarget(1, [...heights, ...new Array(COLS - heights.length).fill(0)]);
const fill = (cellsList) => {
  const filled = new Uint8Array(COLS * ROWS);
  cellsList.flat().forEach((idx) => { filled[idx] = 1; });
  return filled;
};
const at = (x, y) => y * COLS + x;

test('the embedded catalogue is the 20 generated stepped figures and all can be built', () => {
  const generated = core.buildCatalogue();
  assert.equal(generated.length, 20);
  assert.deepEqual(generated.map((fig) => fig.heights), core.CATALOGUE_HEIGHTS);
  const figures = core.catalogue();
  assert.equal(new Set(figures.map((fig) => fig.heights.join('-'))).size, 20);
  for (const fig of figures) {
    assert.ok(fig.count >= 28 && fig.count <= 36 && fig.count % 4 === 0, fig.id);
    core.withTiling(fig);
    assert.equal(fig.tiling.length * 4, fig.count, fig.id);
    assert.deepEqual(fig.tiling.flat().sort((a, b) => a - b), [...fig.list].sort((a, b) => a - b), fig.id);
  }
});

test('the same shape built with different pieces is a win', () => {
  const rect = targetOf([2, 2, 2, 2]);
  const twoSquares = [[at(0, 10), at(1, 10), at(0, 11), at(1, 11)], [at(2, 10), at(3, 10), at(2, 11), at(3, 11)]];
  const twoBars = [[at(0, 10), at(1, 10), at(2, 10), at(3, 10)], [at(0, 11), at(1, 11), at(2, 11), at(3, 11)]];
  assert.equal(core.analyze(rect, fill(twoSquares)).state, 'won');
  assert.equal(core.analyze(rect, fill(twoBars)).state, 'won');
});

test('pieces outside the shape or that make it impossible end the game', () => {
  const rect = targetOf([2, 2, 2, 2]);
  assert.deepEqual(core.analyze(rect, fill([[at(5, 11), at(6, 11), at(5, 10), at(6, 10)]])), { state: 'dead', reason: 'outside' });
  // A T pointing down leaves two isolated single cells.
  const tDown = [[at(0, 10), at(1, 10), at(2, 10), at(1, 11)]];
  assert.equal(core.analyze(rect, fill(tDown)).state, 'dead');
  // A valid first piece keeps the game alive.
  assert.equal(core.analyze(rect, fill([[at(0, 10), at(1, 10), at(0, 11), at(1, 11)]])).state, 'ok');
});

test('simulation: a second piece appears 3.5 s later and K removes the oldest', () => {
  const sim = core.createSim({ target: targetOf([4, 4, 4]), random: () => 0.5 });
  sim.advance(1000);
  assert.equal(sim.active.length, 1);
  const first = sim.active[0].id;
  sim.advance(3000);
  assert.equal(sim.active.length, 2);
  assert.equal(sim.active[0].id, first);
  assert.equal(sim.discard(), true);
  assert.equal(sim.active.length, 1);
  assert.notEqual(sim.active[0].id, first);
});

test('simulation: score is 70 points per 32 s and winning adds 150', () => {
  assert.equal(core.timeScore(32000), 70);
  assert.equal(core.timeScore(64000), 140);
  assert.equal(core.timeScore(16000), 35);
  // random() = 0 always gives the I piece, which spawns on columns 3-6.
  const sim = core.createSim({ target: targetOf([0, 0, 0, 1, 1, 1, 1]), random: () => 0 });
  sim.advance(20000);
  assert.equal(sim.status, 'won');
  assert.equal(sim.score(), core.timeScore(sim.elapsed) + 150);
});

test('simulation: a wrong piece loses and scores nothing', () => {
  // random() = 0.15 always gives the O piece, which cannot fit a one-row shape.
  const sim = core.createSim({ target: targetOf([0, 0, 0, 1, 1, 1, 1]), random: () => 0.15 });
  sim.advance(20000);
  assert.equal(sim.status, 'lost');
  assert.equal(sim.reason, 'outside');
  assert.ok(core.timeScore(sim.elapsed) > 0);
  assert.equal(sim.score(), 0);
  assert.equal(sim.move(1), false);
});

test('the page declares the core before the game script', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'juegos', 'Tetris', 'tetrareplica', 'index.html'), 'utf8');
  assert.ok(html.indexOf('tetrareplica-core.js') > 0);
  assert.ok(html.indexOf('tetrareplica-core.js') < html.indexOf('tetrareplica.js"'));
});

// ---------------------------------------------------------------------------
// Vista previa: la figura se ve sola 20 s antes de que caiga ninguna pieza
// ---------------------------------------------------------------------------
function pageHarness() {
  const vm = require('node:vm');
  let now = 1000;
  let nextTimer = 0;
  const timers = new Map();
  const elements = new Map();
  const awards = [];
  const listeners = [];
  const make = () => ({
    style: {}, dataset: {}, listeners: {}, textContent: '', innerHTML: '', className: '', width: 280, height: 196,
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); },
    getContext: () => null, focus() {}, querySelector: () => null, querySelectorAll: () => [],
  });
  const get = (selector) => { if (!elements.has(selector)) elements.set(selector, make()); return elements.get(selector); };
  const document = {
    querySelector: get,
    querySelectorAll: () => [],
    addEventListener: (type, fn) => listeners.push([type, fn]),
    activeElement: null,
  };
  const schedule = (fn, delay) => { const id = ++nextTimer; timers.set(id, { fn, due: now + delay, delay }); return id; };
  const context = vm.createContext({
    document, console, Date: { now: () => now },
    window: {
      location: { href: '' },
      NSG_I18N: { t: (key, vars) => (vars ? `${key}:${JSON.stringify(vars)}` : key), getLang: () => 'es', applyStaticTranslations() {} },
      NSG_MESSAGES: { random: () => 'GG' },
      NSG: { markGamePlayed: (id) => awards.push(`played:${id}`), addPendingScore: (n) => awards.push(n) },
    },
    setInterval: (fn, delay) => schedule(fn, delay),
    clearInterval: (id) => timers.delete(id),
  });
  context.window.NSG_TETRA_CORE = undefined;
  const root = path.join(__dirname, '..', 'juegos', 'Tetris', 'tetrareplica');
  vm.runInContext(fs.readFileSync(path.join(root, 'tetrareplica-core.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'tetrareplica.js'), 'utf8'), context);
  const advance = (ms) => {
    const end = now + ms;
    for (;;) {
      const item = [...timers.entries()].filter(([, t]) => t.due <= end).sort((a, b) => a[1].due - b[1].due)[0];
      if (!item) break;
      const [, timer] = item;
      now = timer.due;
      timer.due += timer.delay;
      timer.fn();
    }
    now = end;
  };
  const key = (name) => listeners.filter(([type]) => type === 'keydown').forEach(([, fn]) => fn({ key: name, preventDefault() {} }));
  return { advance, key, get, run: (code) => vm.runInContext(code, context), window: context.window, awards };
}

test('the preview lasts 20 s: no pieces fall, the clock stands still and keys do nothing', () => {
  assert.equal(core.CONFIG.previewMs, 20000);
  const h = pageHarness();
  h.get('#start-btn').listeners.click[0]();
  assert.equal(h.run('mode'), 'preview');
  assert.deepEqual(h.awards, ['played:tetrareplica']);
  assert.equal(h.get('#preview').style.display, '');
  h.key('ArrowLeft');
  h.advance(14000);
  assert.equal(h.run('mode'), 'preview');
  assert.equal(h.run('sim.active.length'), 0);
  assert.equal(h.run('sim.elapsed'), 0);
  assert.equal(h.get('#preview-count').style.display, 'none'); // aún no hay contador (faltan más de 5 s)
  h.advance(1000);
  assert.equal(h.get('#preview-count').textContent.includes('"n":5'), true); // faltan 5 s: empieza el 5
  h.advance(2000);
  assert.equal(h.get('#preview-count').textContent.includes('"n":3'), true);
  h.advance(3000 + 100);
  assert.equal(h.run('mode'), 'playing');
});

test('when the game starts the counter shows 0 for a moment and then the banner disappears', () => {
  const h = pageHarness();
  h.get('#start-btn').listeners.click[0]();
  h.advance(20100);
  assert.equal(h.run('mode'), 'playing');
  assert.equal(h.get('#preview').style.display, '');
  assert.ok(h.get('#preview-count').textContent.includes('"n":0'));
  h.advance(1000);
  assert.equal(h.get('#preview').style.display, 'none');
  assert.ok(h.run('sim.elapsed') > 0);
});

test('pausing during the preview freezes the countdown and resuming continues it', () => {
  const h = pageHarness();
  h.get('#start-btn').listeners.click[0]();
  h.advance(5000);
  assert.equal(h.window.NSG_GAME_CONTROL.isActive(), true);
  assert.equal(h.window.NSG_GAME_CONTROL.pause(), true);
  const left = h.run('previewLeft');
  h.advance(60000);
  assert.equal(h.run('previewLeft'), left);
  h.window.NSG_GAME_CONTROL.resume();
  h.advance(1000);
  assert.ok(h.run('previewLeft') < left);
  assert.equal(h.run('mode'), 'preview');
});

test('the card instructions and the page mention the preview, and its texts exist in every language', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'juegos', 'Tetris', 'tetrareplica', 'index.html'), 'utf8');
  assert.ok(html.includes('id="rule-preview"') && html.includes('id="preview"'));
  assert.deepEqual(require('./helpers/texts.cjs').missingKeys(['tetrareplica.rulePreview', 'tetrareplica.previewMessage', 'tetrareplica.previewCountdown']), []);
});
