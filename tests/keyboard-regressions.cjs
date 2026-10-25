// Run with: node --test tests/keyboard-regressions.cjs
const { secretsHarness } = require('./helpers/secrets-harness.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Minimal DOM and virtual clock: execute the actual game scripts without
// audio/canvas, so tests can advance through pauses without waiting 90s.
function harness(file, withQuit = false, canvasContext = null) {
  let now = 1000;
  let nextTimer = 0;
  const timers = new Map();
  const elements = new Map();
  let document;
  class Element {
    constructor() {
      this.style = {};
      this.listeners = {};
      this.inert = false;
      this.isConnected = true;
      this.innerHTML = '';
      this.textContent = '';
      this.classList = { add() {}, remove() {}, toggle() {} };
      this.attrs = {};
      this.dataset = {};
    }
    setAttribute(k, v) { this.attrs[k] = v; }
    hasAttribute(k) { return k in this.attrs; }
    getClientRects() { return this.style.display === 'none' ? [] : [{}]; }
    matches(selector) { return selector === '.panel' && this === get('.panel'); }
    focus() { document.activeElement = this; }
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
    querySelector(selector) { return get(selector); }
    querySelectorAll() { return [get('#quit-stay-btn'), get('#quit-leave-btn')]; }
    getContext() { return canvasContext; }
    prepend(el) { this.prepended = el; }
  }
  const get = (selector) => {
    if (!elements.has(selector)) elements.set(selector, new Element());
    return elements.get(selector);
  };
  document = {
    activeElement: get('#start-btn'),
    body: { children: [get('.panel')], appendChild(el) { this.children.push(el); } },
    querySelector: get,
    querySelectorAll: () => [get('a.back-link')],
    createElement: () => new Element(),
    listeners: {},
    addEventListener(type, fn, capture = false) {
      (this.listeners[type] ||= []).push({ fn, capture });
    },
  };
  const awards = [];
  const context = vm.createContext({
    document, console, Date: { now: () => now },
    window: {
      location: { href: '' },
      NSG_I18N: { t: (key) => key, getLang: () => 'es', applyStaticTranslations() {} },
      NSG_MESSAGES: { random: () => 'GG' },
      NSG: {
        markGamePlayed() {},
        addPendingScore: (score) => awards.push(score),
        setProvisionalScore() {},
        settleProvisionalScore: (score) => awards.push(score),
      },
    },
    setInterval: (fn, delay) => schedule(fn, delay, true),
    setTimeout: (fn, delay) => schedule(fn, delay, false),
    clearInterval: (id) => timers.delete(id),
    clearTimeout: (id) => timers.delete(id),
  });
  function schedule(fn, delay, repeat) {
    const id = ++nextTimer;
    timers.set(id, { fn, due: now + delay, delay, repeat });
    return id;
  }
  function load(name) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', name), 'utf8'), context);
  }
  if (withQuit) load('scripts/quit-confirm.js');
  // Load the game's own dependencies in the order its page declares them; shared
  // scripts/ modules stay mocked by this harness.
  const page = path.posix.join(path.posix.dirname(file), 'index.html');
  const pageScripts = [...fs.readFileSync(path.join(__dirname, '..', page), 'utf8').matchAll(/<script src="([^"]+)"/g)]
    .map(([, src]) => path.posix.normalize(path.posix.join(path.posix.dirname(page), src)))
    .filter((src) => src.startsWith('juegos/') || src.startsWith('debug/'));
  for (const src of pageScripts) if (src !== file) load(src);
  load(file);
  function advance(ms) {
    const end = now + ms;
    while (true) {
      const item = [...timers.entries()].filter(([, timer]) => timer.due <= end)
        .sort((a, b) => a[1].due - b[1].due)[0];
      if (!item) break;
      const [id, timer] = item;
      now = timer.due;
      if (timer.repeat) timer.due += timer.delay;
      else timers.delete(id);
      timer.fn();
    }
    now = end;
  }
  function key(key, shiftKey = false) {
    let stopped = false;
    const event = { key, shiftKey, repeat: false, preventDefault() {},
      stopPropagation() { stopped = true; }, stopImmediatePropagation() { stopped = true; } };
    for (const { fn, capture } of document.listeners.keydown || []) {
      if (capture && !stopped) fn(event);
    }
    const overlay = document.body.children.find((el) => el.className === 'quit-confirm-overlay');
    if (!stopped && overlay?.style.display === 'flex') {
      for (const fn of overlay.listeners.keydown || []) fn(event);
    }
    for (const { fn, capture } of document.listeners.keydown || []) {
      if (!capture && !stopped) fn(event);
    }
  }
  return { run: (code) => vm.runInContext(code, context), advance, get, key, awards,
    document, window: context.window };
}

test('body contact removes one segment; self-contact damage remains two', () => {
  const h = harness('juegos/SnakeContainer/snake/snake.js');
  h.run(`segments = Array.from({length: 8}, (_, x) => ({x, y: 5}));
    bugs = [{x: 4, y: 5}]; handleBugHit(findBugTouchingSnake());`);
  assert.equal(h.run('segments.length'), 7);
  assert.equal(h.run('findBugTouchingSnake()'), -1);
  h.run('shrinkSnake()');
  assert.equal(h.run('segments.length'), 5);
  h.run('segments.length = 3; handleBugHit(0)');
  assert.equal(h.run('segments.length'), 3);
  // Score depends on the final length, not on the longest length reached.
  const withLength = (length) => h.run(`winBaseScore = 50;
    segments = Array.from({length: ${length}}, (_, x) => ({x, y: 5})); computeCurrentScoreEstimate()`);
  assert.equal(withLength(16), 0);
  assert.equal(withLength(17), 50);
  assert.equal(withLength(18), 56);
});

test('blue apples: one or two total, one on the board, 8 s immunity then 23 active seconds before the next', () => {
  for (const [roll, expected] of [[0, 1], [0.99, 2]]) {
    const h = harness('juegos/SnakeContainer/snake/snake.js');
    h.run(`Math.random = () => ${roll}; powerups.reset(true)`);
    h.advance(4999);
    h.run('powerups.update()');
    assert.equal(h.run('powerups.cells().length'), 0);
    h.advance(1);
    h.run('powerups.update()');
    const first = h.run('JSON.stringify(powerups.cells())');
    assert.equal(h.run('powerups.cells().length'), 1);
    assert.equal(h.run(`powerups.cells().some(a => [...segments, ...apples, ...bugs]
      .some(b => cellsEqual(a, b)))`), false);
    h.advance(40000); // An uneaten apple must not be replaced or accompanied by another.
    h.run('powerups.update()');
    assert.equal(h.run('JSON.stringify(powerups.cells())'), first);
    h.run('powerups.consume(powerups.cells()[0]); powerups.update()');
    assert.equal(h.run('powerups.cells().length'), 0);
    assert.equal(h.run('powerups.isImmune()'), true);
    h.advance(10000);
    h.run('powerups.pause()'); // Paused time counts neither for immunity nor for the gap.
    h.advance(60000);
    h.run('powerups.update()');
    assert.equal(h.run('powerups.cells().length'), 0);
    h.run('powerups.resume()');
    h.advance(20999); // 8 s immunity + 23 s gap = 31 active seconds after eating.
    h.run('powerups.update()');
    assert.equal(h.run('powerups.cells().length'), 0);
    h.advance(1);
    h.run('powerups.update()');
    assert.equal(h.run('powerups.cells().length'), expected === 2 ? 1 : 0);
    h.run('if (powerups.cells().length) powerups.consume(powerups.cells()[0])');
    h.advance(90000);
    h.run('powerups.update()');
    assert.equal(h.run('powerups.cells().length'), 0, 'no more than the drawn total');
    h.run('powerups.reset(false)');
    h.advance(90000);
    h.run('powerups.update()');
    assert.equal(h.run('powerups.cells().length'), 0);
    assert.equal(h.run('powerups.isImmune()'), false);
  }
});

test('Snakes with blue apples turn every segment blue, ignore bugs for 8 active seconds, then restore damage', () => {
  for (const name of ['snake2', 'snake3']) {
    const colors = [];
    const ctx = {
      clearRect() {}, beginPath() {}, arc() {}, fillRect() {},
      roundRect() { colors.push(this.fillStyle); }, fill() {},
    };
    const h = harness(`juegos/SnakeContainer/${name}/${name}.js`, true, ctx);
    h.run('startGame(); clearInterval(gameInterval); powerups.reset(true)');
    h.advance(5000);
    h.run(`powerups.update();
      const blue = powerups.cells()[0];
      segments = Array.from({length:8}, (_, i) => ({x:wrap(blue.x - 1 - i), y:blue.y}));
      nextDirection = {x:1, y:0}; bugs = [{...blue, target:{x:0,y:0}}];
      apples = []; moveSnake();`);
    assert.equal(h.run('segments.length'), 9);
    assert.equal(h.run('powerups.cells().length'), 0);
    const deadline = h.run('roundEnd');
    h.run('handleBugHit(0)');
    assert.equal(h.run('segments.length'), 9);
    assert.equal(h.run('roundEnd'), deadline);
    colors.length = 0;
    h.run('render()');
    assert.deepEqual(colors, ['#1764b0', ...Array(8).fill('#278de0')]);
    h.run('shrinkSnake()'); // Immunity does not protect against self-collisions.
    assert.equal(h.run('segments.length'), 7);
    h.advance(3000);
    h.key('Escape');
    h.advance(30000);
    assert.equal(h.run('powerups.isImmune()'), true);
    h.key('Escape');
    h.run('clearInterval(gameInterval)');
    h.advance(4999);
    assert.equal(h.run('powerups.isImmune()'), true);
    h.advance(1);
    assert.equal(h.run('powerups.isImmune()'), false);
    colors.length = 0;
    h.run('render()');
    assert.deepEqual(colors, ['#4c7a4f', ...Array(6).fill('#69a86d')]);
    const resumedDeadline = h.run('roundEnd');
    h.run('handleBugHit(0)');
    if (name === 'snake3') {
      const lost = resumedDeadline - h.run('roundEnd');
      assert.ok(lost >= 2000 && lost <= 4000);
      assert.equal(h.run('segments.length'), 7);
    } else {
      assert.equal(h.run('segments.length'), 5);
    }
    h.run('resetState()');
    assert.equal(h.run('powerups.isImmune()'), false);
    assert.equal(h.run('powerups.cells().length'), 0);
  }
});

for (const name of ['snake', 'snake2', 'snake3']) {
  test(`${name} difficulty: shared ids, exact weighted draw and the indicator shows the governing tier`, () => {
    const h = harness(`juegos/SnakeContainer/${name}/${name}.js`);
    const tiers = JSON.parse(h.run('JSON.stringify(DIFFICULTY_TIERS)'));
    assert.deepEqual(tiers.map((tier) => tier.id), ['very-easy', 'easy-medium', 'medium', 'medium-hard', 'hard', 'very-hard']);
    assert.ok(tiers.every((tier) => tier.label && tier.weight > 0));
    const total = tiers.reduce((sum, tier) => sum + tier.weight, 0);
    const draws = total * 100;
    const counts = JSON.parse(h.run(`(() => {
      const counts = {};
      for (let i = 0; i < ${draws}; i++) {
        Math.random = () => (i + 0.5) / ${draws};
        const id = pickWeightedTier().id;
        counts[id] = (counts[id] || 0) + 1;
      }
      return JSON.stringify(counts);
    })()`));
    assert.deepEqual(counts, Object.fromEntries(tiers.map((tier) => [tier.id, tier.weight * 100])));
    const indicator = h.get(`#${name}-game`).prepended;
    for (let index = 0; index < tiers.length; index += 1) {
      h.run(`pickWeightedTier = () => DIFFICULTY_TIERS[${index}]; rollDifficulty()`);
      assert.equal(indicator.dataset.difficulty, tiers[index].id);
      assert.equal(h.run('bugCount'), tiers[index].bugCount);
      assert.equal(h.run('winBaseScore'), tiers[index].baseScore);
    }
  });
}

test('Snake difficulty gates blue apples (none in Snake 1) and increases normal food only above high', () => {
  for (const name of ['snake', 'snake2', 'snake3']) {
    const h = harness(`juegos/SnakeContainer/${name}/${name}.js`);
    for (let index = 0; index < 6; index += 1) {
      h.run(`pickWeightedTier = () => DIFFICULTY_TIERS[${index}]; rollDifficulty(); spawnApples()`);
      if (index === 5) assert.ok(h.run('apples.length >= 3 && apples.length <= 4'));
      if (index === 4) assert.equal(h.run('apples.length'), 1);
      h.advance(5000);
      h.run('powerups.update()');
      assert.equal(h.run('powerups.cells().length'), name !== 'snake' && index >= 4 ? 1 : 0);
    }
  }
});

test('calculator final-round delay pauses and awards only once after resuming', () => {
  const h = harness('juegos/Calculadora/calculadora1/calculadora1.js');
  h.run('startGame(); roundsPlayed = 5; finishRound(true)');
  h.advance(1000);
  h.run('pauseGame()');
  h.advance(10000);
  assert.deepEqual(h.awards, []);
  assert.equal(h.run('mode'), 'intermission');
  h.run('resumeGame()');
  h.advance(1700);
  assert.deepEqual(h.awards, []);
  h.advance(100);
  assert.deepEqual(h.awards, [10]);
  h.run('endGame()');
  assert.deepEqual(h.awards, [10]);
});

test('round-based calculators only show the flavor message in the final overlay', () => {
  const files = [
    'juegos/Calculadora/calculadora1/calculadora1.js',
    'juegos/Calculadora/calculadora2/calculadora2.js',
    'juegos/Calculadora/calculadora3/calculadora3.js',
    'juegos/Calculadora/calculadora4/calculadora4.js',
  ];
  for (const file of files) {
    const h = harness(file);
    const calls = [];
    h.window.NSG_MESSAGES.random = (language, kind) => {
      calls.push({ language, kind });
      return `MSG:${kind}`;
    };
    h.run('startGame(); finishRound(true)');
    assert.equal(h.run('mode'), 'intermission');
    assert.equal(calls.length, 0);
    assert.ok(!h.get('#intro-overlay').innerHTML.includes('flavor-message'));

    h.run('mode = "playing"; roundsPlayed = 5; roundsWon = 3; finishRound(false)');
    h.advance(2800);
    assert.equal(h.run('mode'), 'ended');
    assert.deepEqual(calls, [{ language: 'es', kind: 'victory' }]);
    assert.ok(h.get('#intro-overlay').innerHTML.includes('class="flavor-message"'));
    assert.equal(h.get('#end-flavor').textContent, 'MSG:victory');
  }

  const defeat = harness('juegos/Calculadora/calculadora1/calculadora1.js');
  let defeatKind = null;
  defeat.window.NSG_MESSAGES.random = (language, kind) => {
    defeatKind = kind;
    return `MSG:${kind}`;
  };
  defeat.run('startGame(); mode = "playing"; roundsPlayed = 5; roundsWon = 2; finishRound(false)');
  defeat.advance(2800);
  assert.equal(defeat.run('mode'), 'ended');
  assert.equal(defeatKind, 'defeat');
});

test('Escape traps focus, blocks input, preserves calculation and resumes clock', () => {
  const h = harness('juegos/Calculadora/calculadora1/calculadora1.js', true);
  h.run("startGame(); enterNumber('7')");
  h.get('.panel').focus();
  const deadline = h.run('roundEnd');
  h.key('Escape');
  assert.equal(h.run('paused'), true);
  assert.equal(h.run('current'), '7');
  assert.equal(h.document.activeElement, h.get('#quit-stay-btn'));
  assert.equal(h.get('.panel').inert, true);
  h.key('Tab');
  assert.equal(h.document.activeElement, h.get('#quit-leave-btn'));
  h.key('Tab');
  assert.equal(h.document.activeElement, h.get('#quit-stay-btn'));
  h.key('Tab', true);
  assert.equal(h.document.activeElement, h.get('#quit-leave-btn'));
  h.key('ArrowLeft');
  assert.equal(h.document.activeElement, h.get('#quit-stay-btn'));
  h.key('9');
  assert.equal(h.run('current'), '7');
  h.advance(5000);
  h.key('Escape');
  assert.equal(h.run('paused'), false);
  assert.equal(h.run('roundEnd'), deadline + 5000);
  assert.equal(h.document.activeElement, h.get('.panel'));
  assert.equal(h.get('.panel').inert, false);
  assert.deepEqual(h.awards, []);
});

test('confirming departure does not award current-game points', () => {
  const h = harness('juegos/Calculadora/calculadora1/calculadora1.js', true);
  h.run('startGame(); score = 30');
  h.key('Escape');
  assert.equal(h.get('#quit-confirm-score').textContent, 30);
  h.get('#quit-leave-btn').listeners.click[0]();
  assert.equal(h.window.location.href, '../../../index.html');
  assert.deepEqual(h.awards, []);
});

test('calculator 2 uses a 40% negative threshold and accepts negative solutions', () => {
  const h = harness('juegos/Calculadora/calculadora2/calculadora2.js', true);
  h.run(`window.NSG.markGamePlayed = (id) => { window.playedId = id; }; startGame();`);
  assert.equal(h.window.playedId, 'calculadora2');
  for (const [roll, expected] of [[0, -500000], [0.399999, -500000], [0.4, 500000], [0.999999, 500000]]) {
    h.run(`{
      const values = [0, ${roll}];
      Math.random = () => values.shift();
      startRound();
    }`);
    assert.equal(h.run('target'), expected);
    assert.equal(h.get('#target').textContent, String(expected));
  }
  h.run(`Math.random = () => 0; startRound();
    enterNumber('0'); chooseOperator('−'); enterNumber('500000'); calculate();`);
  assert.equal(h.run('score'), 12);
  assert.equal(h.run('mode'), 'intermission');
  h.key('Escape');
  assert.equal(h.run('paused'), true);
  h.key('Escape');
  assert.equal(h.run('paused'), false);
  assert.deepEqual(h.awards, []);
});

test('snake movement, clock and message are frozen during confirmation', () => {
  const h = harness('juegos/SnakeContainer/snake/snake.js', true);
  h.run("startGame(); flashMessage('hit', 'failure')");
  const before = h.run('JSON.stringify(segments)');
  const deadline = h.run('roundEnd');
  h.key('Escape');
  h.advance(10000);
  assert.equal(h.run('JSON.stringify(segments)'), before);
  assert.equal(h.get('#message').textContent, 'hit');
  h.key('Escape');
  assert.equal(h.run('roundEnd'), deadline + 10000);
  h.advance(150);
  assert.notEqual(h.run('JSON.stringify(segments)'), before);
});

test('snake 2 removes two segments on body hits and respects minimum length', () => {
  const h = harness('juegos/SnakeContainer/snake2/snake2.js', true);
  h.run(`window.NSG.markGamePlayed = id => { window.playedId = id; }; startGame();
    segments = Array.from({length: 8}, (_, x) => ({x, y: 5}));
    bugs = [{x: 4, y: 5}]; handleBugHit(findBugTouchingSnake());`);
  assert.equal(h.window.playedId, 'snake2');
  assert.equal(h.run('segments.length'), 6);
  h.run('segments.length = 4; handleBugHit(0)');
  assert.equal(h.run('segments.length'), 3);
  h.key('Escape');
  assert.equal(h.run('paused'), true);
  h.key('Escape');
  assert.equal(h.run('paused'), false);
});

test('snake 3 steals 2–4 seconds, preserves length and ends immediately at zero', () => {
  const h = harness('juegos/SnakeContainer/snake3/snake3.js', true);
  h.run(`window.NSG.markGamePlayed = id => { window.playedId = id; }; startGame();
    segments = Array.from({length: 18}, (_, x) => ({x, y: 5}));`);
  assert.equal(h.window.playedId, 'snake3');
  // Final length 18 scores the drawn tier's base plus one extra segment.
  const expected = h.run('winBaseScore') + 6;
  for (const [roll, seconds] of [[0, 2], [0.5, 3], [0.999999, 4]]) {
    const deadline = h.run('roundEnd');
    h.run(`Math.random = () => ${roll}; bugs = [{x: 4, y: 5}];
      handleBugHit(findBugTouchingSnake());`);
    assert.equal(h.run('roundEnd'), deadline - seconds * 1000);
    assert.equal(h.run('segments.length'), 18);
  }
  const deadline = h.run('roundEnd');
  h.key('Escape');
  h.advance(5000);
  h.key('Escape');
  assert.equal(h.run('roundEnd'), deadline + 5000);
  h.run('roundEnd = Date.now() + 1000; handleBugHit(0)');
  assert.equal(h.run('mode'), 'ended');
  assert.equal(h.get('#target').textContent, '0:00');
  assert.deepEqual(h.awards, [expected]);
  h.run('endGame()');
  assert.deepEqual(h.awards, [expected]);
});

test('calculator 3 generates and solves positive targets with 1–3 decimal places', () => {
  const h = harness('juegos/Calculadora/calculadora3/calculadora3.js', true);
  h.run('window.NSG.markGamePlayed = id => { window.playedId = id; }; startGame();');
  assert.equal(h.window.playedId, 'calculadora3');
  for (const [roll, decimals] of [[0, 1], [0.5, 2], [0.999999, 3]]) {
    h.run(`{
      const values = [0.999999999, ${roll}, 0.999999999, 0.999999999];
      Math.random = () => values.shift(); startRound();
    }`);
    const target = h.run('target');
    assert.ok(target > 0);
    assert.equal(String(target).split('.')[1].length, decimals);
    assert.equal(h.get('#target').textContent, String(target).replace('.', ','));
    const before = h.run('score');
    h.run(`for (const char of String(target)) {
      if (char === '.') handleAction('decimal'); else enterNumber(char);
    }
    chooseOperator('+'); enterNumber('0'); calculate();`);
    assert.equal(h.run('mode'), 'intermission');
    assert.equal(h.run('score'), before + 12);
  }
  h.key('Escape');
  assert.equal(h.run('paused'), true);
  h.key('Escape');
  assert.equal(h.run('paused'), false);
});

test('calculator 4 mixes signs, uses 2–3 decimals and caps targets at 25M', () => {
  const h = harness('juegos/Calculadora/calculadora4/calculadora4.js', true);
  h.run('window.NSG.markGamePlayed = id => { window.playedId = id; }; startGame();');
  assert.equal(h.window.playedId, 'calculadora4');

  // Escala de 2 decimales, límite inferior y signo positivo (roll >= 0.5).
  h.run(`{
    const values = [0.25, 0, 0.75];
    Math.random = () => values.shift(); startRound();
  }`);
  assert.equal(h.run('target'), 500000);
  assert.equal(h.run('targetDecimals'), 2);
  assert.equal(h.get('#target').textContent, '500000,00');

  // En inglés el separador visible es el punto, no la coma.
  h.window.NSG_I18N.getLang = () => 'en';
  h.run(`{
    const values = [0.25, 0, 0.75];
    Math.random = () => values.shift(); startRound();
  }`);
  assert.equal(h.get('#target').textContent, '500000.00');
  h.window.NSG_I18N.getLang = () => 'es';

  // Escala de 3 decimales, límite superior y signo positivo.
  h.run(`{
    const values = [0.75, 0.9999999999999999, 0.75];
    Math.random = () => values.shift(); startRound();
  }`);
  assert.equal(h.run('target'), 25000000);
  assert.equal(h.run('targetDecimals'), 3);
  assert.equal(h.get('#target').textContent, '25000000,000');

  // Un roll < 0.5 hace el objetivo negativo.
  h.run(`{
    const values = [0.25, 0, 0.499999];
    Math.random = () => values.shift(); startRound();
  }`);
  assert.equal(h.run('target'), -500000);
  assert.equal(h.get('#target').textContent, '-500000,00');

  // El umbral exacto 0.5 deja el objetivo en positivo.
  h.run(`{
    const values = [0.25, 0, 0.5];
    Math.random = () => values.shift(); startRound();
  }`);
  assert.equal(h.run('target'), 500000);

  // Un objetivo negativo de tres decimales se puede resolver con la tecla +/-.
  h.run(`{
    const values = [0.75, 0, 0];
    Math.random = () => values.shift(); startRound();
    enterNumber('500000'); handleAction('sign');
    chooseOperator('+'); enterNumber('0'); calculate();
  }`);
  assert.equal(h.run('score'), 12);
  assert.equal(h.run('mode'), 'intermission');

  h.key('Escape');
  assert.equal(h.run('paused'), true);
  h.key('Escape');
  assert.equal(h.run('paused'), false);
});

test('calculator 4 is registered with difficulty 10', () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'scripts/games-data.js'), 'utf8'), context);
  const game = context.window.NSG_GAMES.find((entry) => entry.id === 'calculadora4');
  assert.ok(game);
  assert.equal(game.difficulty, 10);
  assert.equal(game.href, 'juegos/Calculadora/calculadora4/index.html');
  assert.equal(game.locked, false);
});

test('calculator 1 targets are positive whole numbers within the requested bounds', () => {
  const h = harness('juegos/Calculadora/calculadora1/calculadora1.js');
  h.run('Math.random = () => 0; startRound()');
  assert.equal(h.run('target'), 500000);
  h.run('Math.random = () => 0.999999999; startRound()');
  assert.equal(h.run('target'), 10000000);
  assert.equal(h.run('Number.isInteger(target)'), true);

  const context = vm.createContext({ window: {} });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'scripts/games-data.js'), 'utf8'), context);
  const game = context.window.NSG_GAMES.find((entry) => entry.id === 'calculadora');
  assert.equal(game.href, 'juegos/Calculadora/calculadora1/index.html');
});

test('All in is registered with unknown difficulty', () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'scripts/games-data.js'), 'utf8'), context);
  const game = context.window.NSG_GAMES.find((entry) => entry.id === 'allin');
  assert.ok(game);
  assert.equal(game.title.es, 'All in');
  assert.equal(game.title.en, 'All in');
  assert.equal(game.difficulty, '?');
  assert.equal(game.href, 'juegos/All-inContainer/allin1/index.html');
  assert.equal(game.illustration, 'soon');
  assert.equal(game.locked, false);
});

test('All in messages are unique, bilingual and separate from the general pool', () => {
  const storage = new Map();
  const context = vm.createContext({
    localStorage: {
      getItem: (key) => (storage.has(key) ? storage.get(key) : null),
      setItem: (key, value) => { storage.set(key, String(value)); },
    },
    document: { documentElement: {} },
    window: {},
  });
  for (const file of ['scripts/localization-data.js', 'scripts/i18n.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
  }
  const i18n = context.window.NSG_I18N;
  assert.equal(i18n.t('allin.winMessage'), 'Has acertado, pero ha sido suerte, no lo olvides.');
  assert.equal(i18n.t('allin.lossMessage'), 'El azar es lo que tiene. Ahora toca recuperar tus puntos.');
  assert.equal(i18n.t('allin.stakeRequired'), 'Para apostar necesitas 5000 puntos que perder');
  storage.set('nsg_lang_v1', 'en');
  assert.equal(i18n.t('allin.winMessage'), "You got it, but it was luck. Don't forget it.");
  assert.equal(i18n.t('allin.lossMessage'), "That's chance for you. Now it's time to win your points back.");
  assert.equal(i18n.t('allin.stakeRequired'), 'You need 5,000 points to bet');
  const pool = fs.readFileSync(path.join(__dirname, '..', 'scripts/messages-data.js'), 'utf8');
  assert.ok(!pool.includes('Has acertado, pero ha sido suerte'));
  assert.ok(!pool.includes('El azar es lo que tiene'));
});

test('score deltas subtract pending first, then saved score, and never go below zero', () => {
  const saved = new Map();
  const pending = new Map();
  const context = vm.createContext({
    console,
    localStorage: {
      getItem: (key) => (saved.has(key) ? saved.get(key) : null),
      setItem: (key, value) => { saved.set(key, String(value)); },
    },
    sessionStorage: {
      getItem: (key) => (pending.has(key) ? pending.get(key) : null),
      setItem: (key, value) => { pending.set(key, String(value)); },
    },
    window: {},
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'scripts/storage.js'), 'utf8'), context);
  const NSG = context.window.NSG;

  assert.equal(NSG.applyScoreDelta(10000), 10000);
  assert.equal(NSG.getPendingScore(), 10000);
  assert.equal(NSG.loadSave().totalScore, 0);

  assert.equal(NSG.applyScoreDelta(-5000), 5000);
  assert.equal(NSG.getPendingScore(), 5000);
  assert.equal(NSG.getDisplayTotal(), 5000);

  saved.set('nsg_save_v1', JSON.stringify({ totalScore: 1000, playedGames: ['snake'] }));
  pending.set('nsg_pending_v1', '800');
  assert.equal(NSG.applyScoreDelta(-500), 1300);
  assert.equal(NSG.getPendingScore(), 300);
  assert.equal(NSG.loadSave().totalScore, 1000);

  pending.set('nsg_pending_v1', '200');
  assert.equal(NSG.applyScoreDelta(-5000), 0);
  assert.equal(NSG.getPendingScore(), 0);
  assert.equal(NSG.getDisplayTotal(), 0);
  assert.equal(NSG.loadSave().totalScore, 0);
  assert.deepEqual(Array.from(NSG.loadSave().playedGames), ['snake']);
});

test('global score-state notifications include temporary game points and settle without double-counting', async () => {
  const saved = new Map([['nsg_save_v1', JSON.stringify({ totalScore: 350, playedGames: [] })]]);
  const pending = new Map();
  const context = vm.createContext({
    console,
    localStorage: {
      getItem: (key) => (saved.has(key) ? saved.get(key) : null),
      setItem: (key, value) => { saved.set(key, String(value)); },
    },
    sessionStorage: {
      getItem: (key) => (pending.has(key) ? pending.get(key) : null),
      setItem: (key, value) => { pending.set(key, String(value)); },
    },
    window: {},
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'scripts/storage.js'), 'utf8'), context);
  const NSG = context.window.NSG;
  const states = [];
  NSG.subscribeScoreState((state) => states.push(state));

  NSG.setProvisionalScore(50);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(states[0].total, 400);
  assert.equal(states[0].displayTotal, 350);

  NSG.settleProvisionalScore(50);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(states[1].total, 400);
  assert.equal(states[1].displayTotal, 400);
  assert.equal(NSG.getDisplayTotal(), 400);
  assert.equal(NSG.getSecretsTotal(), 400);
});

test('secrets: threshold is inclusive and old seen history no longer blocks unlocks', () => {
  const h = secretsHarness();
  const api = h.window.NSG_SECRETS._test;

  assert.equal(api.numberFor('secreto-1'), 1);
  assert.equal(api.sortedSecrets[0].threshold, 150);
  assert.equal(api.findUnlocked(149).length, 0);
  assert.equal(api.findUnlocked(150).length, 1);
  assert.equal(api.findUnlocked(10).length, 0);

  h.setTotal(100);
  assert.equal(api.findUnlocked(49).length, 0);
  assert.equal(api.findUnlocked(50).length, 1);

  h.store.set('nsg_secrets_seen_v3', JSON.stringify(['secreto-1']));
  // Total is 100 here: 499 more reaches 599, below the second threshold (600), so only secret 1 opens.
  assert.equal(api.findUnlocked(499).length, 1);
});

test('secrets: the first crossing of 150 opens the secret once, saves it at once and never reopens it', async () => {
  for (const language of ['es', 'en']) {
    const store = new Map();
    const h = secretsHarness({ total: 149, language, store });
    h.notifyScore();
    assert.equal(h.window.NSG_SECRETS.isOpen(), false);
    h.setTotal(150);
    h.notifyScore();
    assert.equal(h.window.NSG_SECRETS.isOpen(), true);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(h.fetched.at(-1), language === 'es'
      ? 'http://localhost/Textos/ES/Secrets/secreto_001.md'
      : 'http://localhost/Textos/EN/Secrets/secreto_001.md');
    // The history is written when the secret is obtained, even if it is not read yet.
    assert.deepEqual(JSON.parse(store.get('nsg_secrets_history_v1')), ['secreto-1']);
    h.close();
    assert.equal(h.window.NSG_SECRETS.isOpen(), false);
    h.notifyScore(); // Settling the same total must not open a second card.
    // Dropping below the threshold and crossing it again does not reopen it.
    h.setTotal(100);
    h.notifyScore();
    h.setTotal(200);
    h.notifyScore();
    assert.equal(h.window.NSG_SECRETS.isOpen(), false);
    assert.equal(h.fetched.length, 1);
    // Reloading the page keeps the history.
    const reloaded = secretsHarness({ total: 150, language, store });
    reloaded.notifyScore();
    assert.equal(reloaded.window.NSG_SECRETS.isOpen(), false);
  }
});

test('secrets: multiple thresholds are sorted and numbered from the lowest', () => {
  const h = secretsHarness({
    data: [
      { id: 'late', threshold: 500, files: { es: 'late.md', en: 'late.md' } },
      { id: 'early', threshold: 200, files: { es: 'early.md', en: 'early.md' } },
      { id: 'mid', threshold: 350, files: { es: 'mid.md', en: 'mid.md' } },
    ],
  });
  const api = h.window.NSG_SECRETS._test;
  assert.deepEqual(Array.from(api.sortedSecrets, (secret) => secret.id), ['early', 'mid', 'late']);
  assert.equal(api.numberFor('early'), 1);
  assert.equal(api.numberFor('mid'), 2);
  assert.equal(api.numberFor('late'), 3);
  h.setTotal(400);
  assert.deepEqual(Array.from(api.findUnlocked(0), (secret) => secret.id), ['early', 'mid']);
  assert.deepEqual(Array.from(api.findUnlocked(100), (secret) => secret.id), ['early', 'mid', 'late']);
});

test('secrets: missing manuscripts never renumber the available secrets', () => {
  const h = secretsHarness({ data: [
    { id: 'secreto-112', index: 112, threshold: 118080, files: { es: '112.md' } },
    { id: 'secreto-4', index: 4, threshold: 2410, files: { es: '4.md' } },
  ] });
  const api = h.window.NSG_SECRETS._test;
  assert.equal(api.numberFor('secreto-4'), 4);
  assert.equal(api.numberFor('secreto-112'), 112);
  assert.equal(api.findUnlocked(2409).length, 0);
  assert.equal(api.findUnlocked(2410)[0].id, 'secreto-4');
});

test('secrets: markdown is rendered safely without raw HTML', () => {
  const h = secretsHarness();
  const html = h.window.NSG_SECRETS._test.renderMarkdown(
    '<script>alert(1)</script>\n\n# Hola\n\n- uno\n- dos\n\n**fuerte** y *cursiva*',
  );
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('<h2>Hola</h2>'));
  assert.ok(html.includes('<ul><li>uno</li><li>dos</li></ul>'));
  assert.ok(html.includes('<strong>fuerte</strong>'));
  assert.ok(html.includes('<em>cursiva</em>'));
  assert.equal(h.window.NSG_SECRETS._test.renderMarkdown(''), '<p class="secrets-error">load-error</p>');
});

test('secrets: every manifest file exists and has both translations', () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'scripts/secrets-data.js'), 'utf8'), context);
  const entries = context.window.NSG_SECRETS_DATA;
  assert.ok(Array.isArray(entries) && entries.length > 0);
  for (const entry of entries) {
    assert.ok(entry.id);
    assert.ok(Number.isFinite(entry.threshold));
    assert.ok(entry.files && entry.files.es && entry.files.en);
    for (const file of [entry.files.es, entry.files.en]) {
      assert.ok(fs.existsSync(path.join(__dirname, '..', file)), `missing ${file}`);
    }
  }
});
