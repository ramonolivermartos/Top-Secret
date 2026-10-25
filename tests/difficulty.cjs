const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function registry() {
  const context = vm.createContext({ window: {} });
  vm.runInContext(read('scripts/games-data.js'), context);
  return [...context.window.NSG_GAMES].filter((game) => !game.locked);
}

test('every published game loads the debug indicator, before its own script', () => {
  for (const game of registry()) {
    const html = read(game.href);
    const debugAt = html.indexOf('debug/difficulty-debug.js');
    assert.ok(debugAt > 0, game.id);
    const scripts = [...html.matchAll(/<script src="([^"]+)" defer>/g)];
    const last = scripts[scripts.length - 1];
    assert.ok(last.index > debugAt, `${game.id}: the game script goes after the debug indicator`);
  }
});

function jsFiles(dir) {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const child = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) return jsFiles(child);
    return entry.name.endsWith('.js') ? [child] : [];
  });
}

test('games with variable difficulty create their indicator from their tiers; the rest get the fixed one', () => {
  const variable = registry().filter((game) => {
    const family = path.posix.dirname(path.posix.dirname(game.href));
    return jsFiles(family).some((file) => /NSG_DIFFICULTY_DEBUG\s*\.create/.test(read(file)));
  }).map((game) => game.id);
  assert.deepEqual(variable, ['snake', 'snake2', 'snake3', 'laberinto1', 'laberinto2', 'francotirador', 'francotirador2', 'francotirador3']);
});

function loadDebug(enabledSource) {
  const handlers = {};
  const made = [];
  const panel = { prepend(el) { this.indicator = el; made.push(el); }, querySelector: () => null };
  const document = {
    createElement: () => ({ dataset: {}, setAttribute() {}, hidden: false }),
    addEventListener: (type, fn) => { handlers[type] = fn; },
    querySelector: () => panel,
  };
  const context = vm.createContext({ window: {}, document });
  vm.runInContext(enabledSource === undefined ? read('debug/difficulty-debug.js') : enabledSource, context);
  return { api: context.window.NSG_DIFFICULTY_DEBUG, handlers, panel, made };
}

test('a game without tiers gets the fixed indicator when the page loads', () => {
  const { handlers, panel } = loadDebug();
  handlers.DOMContentLoaded();
  assert.equal(panel.indicator.textContent, 'DEBUG · Dificultad: Fija');
  assert.equal(panel.indicator.hidden, false);
});

test('a game that creates its own indicator does not get a second, fixed one', () => {
  const { api, handlers, panel, made } = loadDebug();
  const tiers = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];
  api.create(panel, tiers);
  handlers.DOMContentLoaded();
  assert.equal(made.length, 1);
});

test('one switch in debug/difficulty-debug.js removes every debug message', () => {
  const off = read('debug/difficulty-debug.js').replace('const ENABLED = true;', 'const ENABLED = false;');
  assert.notEqual(off, read('debug/difficulty-debug.js'));
  const { api, handlers, panel, made } = loadDebug(off);
  const tiers = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];
  api.create(panel, tiers).setCurrent(tiers[0]);
  handlers.DOMContentLoaded();
  const fixed = loadDebug(off);
  fixed.handlers.DOMContentLoaded();
  assert.equal(made.length, 0);
  assert.equal(fixed.made.length, 0);
});

test('the debug indicator ignores single-tier lists and tiers from another list', () => {
  const panel = { prepend(el) { this.indicator = el; } };
  const context = vm.createContext({ window: {}, document: { createElement: () => ({ dataset: {}, setAttribute() {} }) } });
  vm.runInContext(read('debug/difficulty-debug.js'), context);
  const { create } = context.window.NSG_DIFFICULTY_DEBUG;
  create(panel, [{ id: 'only', label: 'Only' }]).setCurrent({ id: 'only', label: 'Only' });
  assert.equal(panel.indicator, undefined);
  const tiers = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];
  const debug = create(panel, tiers, 'Difficulty');
  debug.setCurrent(tiers[1]);
  assert.equal(panel.indicator.textContent, 'DEBUG · Difficulty: B');
  assert.equal(panel.indicator.dataset.difficulty, 'b');
  assert.equal(panel.indicator.hidden, false);
  debug.setCurrent({ id: 'b', label: 'B' });
  assert.equal(panel.indicator.hidden, true);
});
