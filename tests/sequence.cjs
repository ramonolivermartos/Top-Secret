// Run with: node --test tests/sequence.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
}

// storage.js + sequence.js on a fake page; `overlay` is a minimal element.
function load() {
  const created = [];
  const makeEl = () => {
    const el = {
      children: [], className: '', textContent: '', type: '', listeners: {}, focused: false,
      setAttribute() {}, addEventListener(type, fn) { this.listeners[type] = fn; },
      append(...nodes) { this.children.push(...nodes); },
      replaceChildren(...nodes) { this.children = nodes; },
      before(node) { this.beforeNode = node; },
      querySelector(sel) { return sel === '.overlay-actions' ? this.actions || null : null; },
      appendChild(node) { this.children.push(node); },
      focus() { this.focused = true; },
    };
    created.push(el);
    return el;
  };
  const body = { classList: { contains: (c) => c === 'game-page' }, prepend(el) { this.bar = el; } };
  const context = vm.createContext({
    document: { body, createElement: makeEl, readyState: 'complete' },
    localStorage: memoryStorage(),
    sessionStorage: memoryStorage(),
    console,
    Promise,
    window: { location: { href: '' } },
  });
  context.window.document = context.document;
  vm.runInContext(read('scripts/storage.js'), context);
  // Like every game page: the generated catalogue and i18n.js come before sequence.js (texts asserted below are English).
  context.localStorage.setItem('nsg_lang_v1', 'en');
  vm.runInContext(read('scripts/localization-data.js'), context);
  vm.runInContext(read('scripts/i18n.js'), context);
  vm.runInContext(read('scripts/sequence.js'), context);
  return { w: context.window, body, makeEl, context };
}

const games = [
  ...['calculadora', 'snake', 'snake2', 'laberinto1', 'tetrareplica', 'calculadora4', 'allin']
    .map((id) => ({ id, href: `juegos/x/${id}/index.html`, locked: false })),
  { id: 'proximamente-1', href: null, locked: true },
];

function rng(seed) {
  let a = seed;
  return () => { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; return a / 4294967296; };
}

test('a sequence has five distinct playable games', () => {
  const { w } = load();
  const random = rng(7);
  for (let i = 0; i < 500; i += 1) {
    const plan = w.NSG_SEQUENCE.plan(games, { random, canBet: i % 2 === 0 });
    assert.equal(plan.length, 5);
    assert.equal(new Set(plan.map((g) => g.id)).size, 5);
    assert.ok(plan.every((g) => !g.locked));
  }
});

test('All in needs the minimum points, appears in about 5% of sequences and always comes last', () => {
  const { w } = load();
  const random = rng(11);
  for (let i = 0; i < 500; i += 1) {
    assert.ok(!w.NSG_SEQUENCE.plan(games, { random, canBet: false }).some((g) => g.id === 'allin'));
  }
  let withAllIn = 0;
  const runs = 4000;
  for (let i = 0; i < runs; i += 1) {
    const plan = w.NSG_SEQUENCE.plan(games, { random, canBet: true });
    const at = plan.findIndex((g) => g.id === 'allin');
    if (at !== -1) {
      withAllIn += 1;
      assert.equal(at, 4);
    }
  }
  assert.ok(withAllIn / runs > 0.035 && withAllIn / runs < 0.065, String(withAllIn / runs));
});

test('the random card only offers All in when its stake can be paid', () => {
  const { w } = load();
  const random = rng(3);
  for (let i = 0; i < 500; i += 1) assert.notEqual(w.NSG_SEQUENCE.pickOne(games, { random, canBet: false }).id, 'allin');
  const seen = new Set();
  for (let i = 0; i < 2000; i += 1) seen.add(w.NSG_SEQUENCE.pickOne(games, { random, canBet: true }).id);
  assert.ok(seen.has('allin'));
});

test('rewards: 5 × 5,000 plus a 10,000 bonus', () => {
  const { w } = load();
  assert.equal(w.NSG_SEQUENCE.reward(5), 35000);
});

test('inside a sequence the games own points are ignored, even All in losses', () => {
  const { w } = load();
  w.NSG.addPendingScore(1000);
  w.NSG_SEQUENCE.begin(games.slice(0, 5));
  w.NSG.addPendingScore(500);
  w.NSG.applyScoreDelta(-800);
  w.NSG.applyScoreDelta(10000);
  w.NSG.setProvisionalScore(900);
  w.NSG.settleProvisionalScore(900);
  assert.equal(w.NSG.getDisplayTotal(), 1000);
  assert.equal(w.NSG.getSecretsTotal(), 1000);
  w.NSG.clearSequence();
  w.NSG.addPendingScore(500);
  assert.equal(w.NSG.getDisplayTotal(), 1500);
});

test('starting the expected game commits the sequence; another game cancels it', () => {
  const { w } = load();
  w.NSG_SEQUENCE.begin(games.slice(0, 5));
  w.NSG.markGamePlayed('calculadora');
  assert.equal(w.NSG.getSequence().phase, 'playing');
  w.NSG.markGamePlayed('snake2');
  assert.equal(w.NSG.getSequence(), null);
});

test('reloading a game page after it started forfeits the sequence', () => {
  const { w } = load();
  w.NSG_SEQUENCE.begin(games.slice(0, 5));
  w.NSG.markGamePlayed('calculadora');
  w.NSG_SEQUENCE.initGamePage();
  assert.equal(w.NSG.getSequence(), null);
});

test('the game page shows a banner while the sequence is pending', () => {
  const { w, body } = load();
  w.NSG_SEQUENCE.begin(games.slice(0, 5));
  w.NSG_SEQUENCE.initGamePage();
  assert.match(body.bar.children[0].textContent, /Minigame 1 of 5/);
  assert.ok(w.NSG.getSequence());
});

function playThrough(outcomes) {
  const h = load();
  const { w, makeEl } = h;
  const plan = games.slice(0, 5);
  w.NSG_SEQUENCE.begin(plan);
  const results = [];
  for (const won of outcomes) {
    if (!w.NSG.getSequence()) break;
    const idx = w.NSG.getSequence().index;
    w.NSG.markGamePlayed(plan[idx].id);
    const overlay = makeEl();
    overlay.actions = makeEl();
    const handled = w.NSG_SEQUENCE.finish({ won, overlay });
    results.push({ handled, overlay, state: w.NSG.getSequence() });
  }
  return { w, results };
}

test('winning the first four games moves on without paying anything', () => {
  const { w, results } = playThrough([true, true, true, true]);
  assert.equal(w.NSG.getSequence().index, 4);
  assert.equal(w.NSG.getSequence().phase, 'pending');
  assert.equal(w.NSG.getDisplayTotal(), 0);
  const actions = results[0].overlay.actions.children;
  assert.equal(actions.length, 2);
  actions[0].listeners.click();
  assert.equal(w.location.href, '../../../juegos/x/snake/index.html');
  actions[1].listeners.click();
  assert.equal(w.location.href, '../../../index.html');
});

test('completing the sequence pays 35,000 and ends it', () => {
  const { w, results } = playThrough([true, true, true, true, true]);
  assert.equal(w.NSG.getSequence(), null);
  assert.equal(w.NSG.getDisplayTotal(), 35000);
  assert.match(results[4].overlay.actions.beforeNode.textContent, /35.000/);
  assert.equal(results[4].overlay.actions.children.length, 1);
});

test('losing any game ends the sequence with 0 points, even after wins', () => {
  const { w, results } = playThrough([true, true, false]);
  assert.equal(w.NSG.getSequence(), null);
  assert.equal(w.NSG.getDisplayTotal(), 0);
  assert.match(results[2].overlay.actions.beforeNode.textContent, /0 points/);
  assert.equal(results[2].overlay.actions.children.length, 1);
});

function reachAllIn(w, makeEl) {
  const plan = [...games.slice(0, 4), games.find((g) => g.id === 'allin')];
  w.NSG_SEQUENCE.begin(plan);
  for (let i = 0; i < 4; i += 1) {
    w.NSG.markGamePlayed(plan[i].id);
    const overlay = makeEl();
    overlay.actions = makeEl();
    w.NSG_SEQUENCE.finish({ won: true, overlay });
  }
  w.NSG.markGamePlayed('allin');
  const overlay = makeEl();
  overlay.actions = makeEl();
  return overlay;
}

test('losing at All in deducts 20,000 from the real total, never below zero', () => {
  const { w, makeEl } = load();
  w.NSG.addPendingScore(30000);
  const overlay = reachAllIn(w, makeEl);
  assert.equal(w.NSG.getDisplayTotal(), 30000);
  w.NSG_SEQUENCE.finish({ won: false, overlay });
  assert.equal(w.NSG.getSequence(), null);
  assert.equal(w.NSG.getDisplayTotal(), 10000);
  assert.match(overlay.actions.beforeNode.textContent, /20.000 points are deducted/);
});

test('the All in penalty cannot push the total below zero', () => {
  const { w, makeEl } = load();
  w.NSG.addPendingScore(6000);
  w.NSG_SEQUENCE.finish({ won: false, overlay: reachAllIn(w, makeEl) });
  assert.equal(w.NSG.getDisplayTotal(), 0);
});

test('winning at All in completes the sequence and pays 60,000 in total', () => {
  const { w, makeEl } = load();
  w.NSG.addPendingScore(7000);
  w.NSG_SEQUENCE.finish({ won: true, overlay: reachAllIn(w, makeEl) });
  assert.equal(w.NSG.getDisplayTotal(), 67000);
});

test('the All in warning appears on its page and only there', () => {
  const { w, body, makeEl } = load();
  reachAllIn(w, makeEl);
  // Back on a pending All in page (as after pressing Next on the fourth game).
  w.NSG.updateSequence({ phase: 'pending' });
  body.bar = null;
  w.NSG_SEQUENCE.initGamePage();
  assert.match(body.bar.children[2].textContent, /Nothing like depending on luck/);
  assert.match(body.bar.children[2].textContent, /20.000/);
  assert.match(body.bar.children[2].textContent, /60.000 points in total/);
});

test('returning to the menu discards an unfinished sequence', () => {
  const { w } = load();
  assert.equal(w.NSG_SEQUENCE.discardAbandoned(), false);
  w.NSG_SEQUENCE.begin(games.slice(0, 5));
  assert.equal(w.NSG_SEQUENCE.discardAbandoned(), true);
  assert.equal(w.NSG.getSequence(), null);
});

test('without a sequence finish leaves the normal end screen alone', () => {
  const { w, makeEl } = load();
  assert.equal(w.NSG_SEQUENCE.finish({ won: true, overlay: makeEl() }), false);
});

test('every game page reports its result and loads the sequence module', () => {
  const registry = vm.createContext({ window: {} });
  vm.runInContext(read('scripts/games-data.js'), registry);
  const pages = registry.window.NSG_GAMES.filter((g) => !g.locked);
  assert.ok(pages.length >= 12);
  for (const game of pages) {
    const html = read(game.href);
    assert.ok(html.includes('scripts/sequence.js'), game.id);
    assert.ok(html.includes('styles/sequence.css'), game.id);
  }
  const scripts = [
    'juegos/Calculadora/calculadora1/calculadora1.js', 'juegos/Calculadora/calculadora2/calculadora2.js',
    'juegos/Calculadora/calculadora3/calculadora3.js', 'juegos/Calculadora/calculadora4/calculadora4.js',
    'juegos/SnakeContainer/snake/snake.js', 'juegos/SnakeContainer/snake2/snake2.js',
    'juegos/SnakeContainer/snake3/snake3.js', 'juegos/All-inContainer/allin1/allin.js',
    'juegos/Laberintos/maze-game.js', 'juegos/Tetris/tetrareplica/tetrareplica.js',
    'juegos/Francotirador/francotirador/francotirador.js',
  ];
  for (const file of scripts) assert.ok(read(file).includes('NSG_SEQUENCE.finish'), file);
});

test('the sequence card text exists in Spanish and English', () => {
  const keys = ['sequence.lost', 'sequence.next', 'menu.sequence.rule4', 'menu.random.modalTitle'];
  assert.deepEqual(require('./helpers/texts.cjs').missingKeys(keys), []);
});
