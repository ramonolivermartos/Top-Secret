const { test } = require('node:test');
const assert = require('node:assert/strict');
const core = require('../juegos/Laberintos/maze-core.js');
const levels = require('../juegos/Laberintos/maze-levels.js');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const games = Object.fromEntries(['laberinto1', 'laberinto2'].map((id) => {
  const config = require(`../juegos/Laberintos/${id}/maze-config.js`);
  return [id, { ...config, tiers: levels.define(config.tiers) }];
}));

test('shared levels award the agreed points', () => {
  assert.deepEqual(Object.fromEntries(levels.levels.map((level) => [level.id, level.points])),
    { 'very-easy': 30, easy: 50, 'easy-medium': 90, medium: 140, 'medium-hard': 230, hard: 300, 'very-hard': 500 });
});

test('weighted selection follows each game distribution', () => {
  for (const [id, expected] of [['laberinto1', [500, 1500, 3000, 5000]], ['laberinto2', [4500, 5500]]]) {
    const { tiers } = games[id];
    const counts = Object.fromEntries(tiers.map((tier) => [tier.id, 0]));
    for (let i = 0; i < 10000; i++) counts[core.pickTier(tiers, () => (i + 0.5) / 10000).id]++;
    assert.deepEqual(Object.values(counts), expected, id);
  }
});

test('each tier generates distinct, connected mazes with its exit approaches and decoys', () => {
  let seed = 192837;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const approaches = { 'very-easy': 2, easy: 2, 'easy-medium': 3, medium: 3, 'medium-hard': 4 };
  for (const tier of [...games.laberinto1.tiers, ...games.laberinto2.tiers]) {
    assert.equal(tier.exitApproaches, approaches[tier.id]);
    let previous = '';
    for (let i = 0; i < (tier.size >= 18 ? 25 : 100); i++) {
      const maze = core.generateForTier(tier, previous, random);
      assert.equal(maze.tier, tier);
      assert.equal(core.matchesTier(core.measure(maze), tier), true);
      assert.notEqual(core.signature(maze), previous);
      previous = core.signature(maze);
      const visited = new Set([maze.entrance]);
      const queue = [maze.entrance];
      for (const cell of queue) for (const next of maze.passages[cell]) {
        if (!visited.has(next)) { visited.add(next); queue.push(next); }
      }
      assert.equal(visited.size, tier.size ** 2);
      const edges = maze.passages.reduce((sum, neighbors) => sum + neighbors.length, 0) / 2;
      assert.ok(edges >= visited.size + 1, 'must contain return circuits');
      const withoutExit = new Set([maze.entrance]);
      const approachQueue = [maze.entrance];
      for (const cell of approachQueue) for (const next of maze.passages[cell]) {
        assert.ok(maze.passages[next].includes(cell));
        if (next !== maze.exit && !withoutExit.has(next)) { withoutExit.add(next); approachQueue.push(next); }
      }
      assert.equal(maze.passages[maze.exit].length, tier.exitApproaches);
      assert.equal(maze.passages[maze.exit].filter((cell) => withoutExit.has(cell)).length, 1,
        'only one exit approach can be reached before winning');
      for (const fake of maze.passages[maze.exit].filter((cell) => !withoutExit.has(cell))) {
        const distances = new Map([[fake, 1]]);
        const decoyQueue = [fake];
        for (const cell of decoyQueue) for (const next of maze.passages[cell]) {
          if (next !== maze.exit && !distances.has(next)) {
            assert.equal(withoutExit.has(next), false);
            distances.set(next, distances.get(cell) + 1);
            decoyQueue.push(next);
          }
        }
        assert.ok(Math.max(...distances.values()) >= tier.minDecoyLength, 'every false approach has a long continuous route');
      }
      const route = core.shortestRoute(maze);
      if (tier.hint) {
        assert.equal(maze.hint, route[Math.floor(route.length / 2)]);
        assert.notEqual(maze.hint, maze.entrance);
        assert.notEqual(maze.hint, maze.exit);
      } else {
        assert.equal(maze.hint, null);
      }
    }
  }
});

test('base generator builds connected trees before return corridors are added', () => {
  const signatures = new Set();
  for (let sample = 0; sample < 50; sample++) {
    const maze = core.generate();
    signatures.add(core.signature(maze));
    const parents = new Map([[maze.entrance, null]]);
    const queue = [maze.entrance];
    for (const cell of queue) {
      for (const next of maze.passages[cell]) {
        assert.ok(maze.passages[next].includes(cell));
        assert.equal(Math.abs(next % maze.width - cell % maze.width) + Math.abs(Math.floor(next / maze.width) - Math.floor(cell / maze.width)), 1);
        if (!parents.has(next)) { parents.set(next, cell); queue.push(next); }
      }
    }
    assert.equal(parents.size, 144);
    assert.equal(maze.passages.reduce((sum, neighbors) => sum + neighbors.length, 0) / 2, 143);
    const route = [];
    for (let cell = maze.exit; cell !== null; cell = parents.get(cell)) route.unshift(cell);
    const run = core.createRun(maze);
    for (const next of route.slice(1)) {
      const previous = run.position;
      assert.equal(core.move(run, next % maze.width - previous % maze.width, Math.floor(next / maze.width) - Math.floor(previous / maze.width)), true);
    }
    assert.equal(run.status, 'won');
    assert.equal(run.trail.length, route.length);
  }
  assert.equal(signatures.size, 50);
});

test('walls, trail and dead ends enforce a single irreversible attempt', () => {
  const maze = { width: 3, height: 2, entrance: 0, exit: 5, passages: [[1], [0, 2, 4], [1], [4], [1, 3, 5], [4]] };
  const run = core.createRun(maze);
  assert.equal(core.move(run, 0, 1), false);
  assert.equal(core.move(run, 1, 0), true);
  assert.equal(core.move(run, -1, 0), false);
  assert.equal(run.position, 1);
  assert.equal(core.move(run, 1, 0), true);
  assert.equal(run.status, 'trapped');
  assert.equal(core.move(run, -1, 0), false);
  assert.deepEqual(run.trail, [0, 1, 2]);
});

test('an open return corridor can lead back to the trail and trap the player', () => {
  // 0→1→4→3→0 is a circuit; the exit is reached instead through 1→2→5.
  const maze = { width: 3, height: 2, entrance: 0, exit: 5,
    passages: [[1, 3], [0, 4, 2], [1, 5], [0, 4], [1, 3], [2]] };
  const run = core.createRun(maze);
  assert.equal(core.move(run, 1, 0), true);
  assert.equal(core.move(run, 0, 1), true);
  assert.equal(core.move(run, -1, 0), true);
  assert.ok(maze.passages[run.position].includes(maze.entrance), 'return corridor is physically open');
  assert.equal(run.status, 'trapped');
  assert.equal(core.move(run, 0, -1), false, 'the trail still blocks the entrance');
});

test('a game plays three rounds, publishes provisional points and settles them once', () => {
  let now = 0;
  let tick;
  let keydown;
  const elements = new Map();
  const canvas = new Proxy({}, { get: () => () => {} });
  function get(id) {
    if (!elements.has(id)) elements.set(id, {
      hidden: false, width: 600, height: 600, listeners: {}, style: {},
      classList: { add() {}, remove() {}, toggle() {} },
      addEventListener(event, callback) { this.listeners[event] = callback; },
      focus() {}, getContext: () => canvas, querySelector: get, querySelectorAll: () => [],
    });
    return elements.get(id);
  }
  const mazes = [];
  const calls = [];
  const NSG = {};
  for (const name of ['markGamePlayed', 'setProvisionalScore', 'settleProvisionalScore']) NSG[name] = (value) => calls.push([name, value]);
  const store = new Map([['nsg_lang_v1', 'en']]);
  const window = {
    NSG,
    NSG_MAZE: { ...core, generateForTier(...args) { const maze = core.generateForTier(...args); mazes.push(maze); return maze; } },
    NSG_MAZE_GAME: games.laberinto2,
    NSG_DIFFICULTY_DEBUG: { create: (panel, tiers) => { debugTiers = tiers; return { setCurrent: (tier) => shown.push(tier) }; } },
    addEventListener() {},
  };
  let debugTiers;
  const shown = [];
  const document = { documentElement: {}, querySelector: get, querySelectorAll: () => [], addEventListener(event, callback) { if (event === 'keydown') keydown = callback; } };
  const context = vm.createContext({
    window, document,
    localStorage: { getItem: (key) => store.get(key), setItem: (key, value) => store.set(key, value) },
    Date: { now: () => now }, setInterval: (callback) => { tick = callback; return 1; }, clearInterval() {},
  });
  // The real catalogue and i18n module: the game only ever asks for keys.
  for (const file of ['localization-data.js', 'i18n.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../scripts', file), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../juegos/Laberintos/maze-game.js'), 'utf8'), context);
  const press = (key) => keydown({ key, repeat: false, preventDefault() {} });
  assert.equal(get('#maze-board').hidden, true);
  assert.equal(window.NSG_GAME_CONTROL.isActive(), false);
  now = 600000; // Waiting on instructions does not use any round time.
  get('#maze-start').listeners.click();
  assert.deepEqual(calls.splice(0), [['markGamePlayed', 'laberinto2'], ['setProvisionalScore', 0]]);
  assert.equal(get('#maze-board').hidden, false);
  assert.equal(get('#maze-timer').textContent, '2:30');
  assert.equal(get('#maze-round').textContent, '1/3');

  // Round 1: the clock freezes while paused, then the round is lost on time.
  now += 60000; tick();
  assert.equal(get('#maze-timer').textContent, '1:30');
  window.NSG_GAME_CONTROL.pause(); now += 300000;
  window.NSG_GAME_CONTROL.resume();
  assert.equal(get('#maze-timer').textContent, '1:30');
  now += 90000; tick();
  assert.match(get('#maze-message').textContent, /Time is up/);
  assert.deepEqual(calls.splice(0), [['setProvisionalScore', 0]]);

  // The break between rounds also freezes while paused.
  window.NSG_GAME_CONTROL.pause(); now += 100000;
  window.NSG_GAME_CONTROL.resume();
  assert.equal(mazes.length, 1);
  now += 5000; tick();
  assert.equal(mazes.length, 2);
  assert.equal(get('#maze-round').textContent, '2/3');

  // Round 2: following the real route wins the tier points.
  const maze = mazes[1];
  const route = core.shortestRoute(maze);
  const keys = { 1: 'ArrowRight', [-1]: 'ArrowLeft', [maze.width]: 'ArrowDown', [-maze.width]: 'ArrowUp' };
  for (let i = 1; i < route.length; i++) press(keys[route[i] - route[i - 1]]);
  const { points } = maze.tier;
  assert.match(get('#maze-message').textContent, new RegExp(`\\+${points} points`));
  assert.deepEqual(calls.splice(0), [['setProvisionalScore', points]]);

  // Round 3 times out; the game settles only after the final delay.
  now += 5000; tick();
  assert.equal(mazes.length, 3);
  now += 150000; tick();
  assert.deepEqual(calls.splice(0), [['setProvisionalScore', points]]);
  assert.equal(window.NSG_GAME_CONTROL.isActive(), true);
  now += 2800; tick();
  assert.deepEqual(calls.splice(0), [['settleProvisionalScore', points]]);
  assert.equal(get('#maze-end-overlay').style.display, 'flex');
  assert.equal(window.NSG_GAME_CONTROL.isActive(), false);
  assert.match(get('#maze-end-detail').textContent, new RegExp(`1 of 3 mazes and earned ${points} points`));

  // The red indicator shows, each round, the same tier that generated that maze.
  assert.equal(debugTiers, games.laberinto2.tiers);
  assert.deepEqual(shown, mazes.map((entry) => entry.tier));

  get('#maze-replay').listeners.click();
  assert.deepEqual(calls.splice(0), [['markGamePlayed', 'laberinto2'], ['setProvisionalScore', 0]]);
  assert.equal(get('#maze-end-overlay').style.display, 'none');
  assert.equal(get('#maze-score').textContent, 0);
});

test('both maze pages load the shared scripts in dependency order', () => {
  for (const id of ['laberinto1', 'laberinto2']) {
    const html = fs.readFileSync(path.join(__dirname, `../juegos/Laberintos/${id}/index.html`), 'utf8');
    const order = ['storage.js', 'maze-levels.js', 'maze-core.js', 'maze-config.js', 'difficulty-debug.js', 'maze-game.js'].map((file) => html.indexOf(file));
    assert.ok(order.every((index, i) => index > 0 && (!i || index > order[i - 1])), id);
  }
});
