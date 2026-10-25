const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');

function load(store = new Map(), random = () => 0) {
  const context = vm.createContext({
    window: {},
    Math: Object.assign(Object.create(Math), { random }),
    localStorage: { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) },
    document: { documentElement: {}, querySelectorAll: () => [] },
  });
  for (const file of ['scripts/localization-data.js', 'scripts/i18n.js', 'scripts/player.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
  }
  return context.window;
}

test('names accept ASCII, accents, Cyrillic and Chinese within 15 units', () => {
  const { validate } = load().NSG_PLAYER;
  for (const name of ['Ramón', 'R2-D2_!?', 'Zoë Œuvre', 'Александра', '李小龙', 'Ann·Lee', 'ABCDEFGHIJKLMNO', '一二三四五六七']) {
    assert.equal(validate(name).ok, true, name);
  }
  assert.equal(validate('  Dark   Lord  ').name, 'Dark Lord');
});

test('invalid names report the typical errors', () => {
  const { validate } = load().NSG_PLAYER;
  const cases = {
    '': 'empty', '   ': 'empty',
    'Emoji🙂': 'chars', 'Ω×2': 'chars', '<b>\u0007</b>': 'chars',
    '!!!': 'symbols', '-- _ --': 'symbols',
    'ABCDEFGHIJKLMNOP': 'length', '一二三四五六七八': 'length', 'Иван Иванов Иваныч': 'length',
  };
  for (const [name, error] of Object.entries(cases)) assert.equal(validate(name).error, error, JSON.stringify(name));
  // Inner tabs and newlines collapse into a single space, so they are accepted.
  assert.equal(validate('Tab\tName').name, 'Tab Name');
});

test('Chinese characters count double toward the limit', () => {
  const { units, MAX_UNITS } = load().NSG_PLAYER;
  assert.equal(MAX_UNITS, 15);
  assert.equal(units('李小龙'), 6);
  assert.equal(units('Li 小龙'), 7);
  assert.equal(units('Иван'), 4);
});

test('the description survives a reload and translates with the language, and changes with a new name', () => {
  const store = new Map();
  let window = load(store, () => 0.5);
  const player = window.NSG_PLAYER.set('Ramón');
  const index = player.description;
  window = load(store, () => 0);
  assert.deepEqual({ ...window.NSG_PLAYER.get() }, { name: 'Ramón', description: index });
  assert.equal(window.NSG_PLAYER.set('Ramón').description, index);
  for (const lang of ['es', 'en', 'fr', 'ru', 'zh-Hans']) {
    assert.equal(window.NSG_PLAYER.describe(window.NSG_PLAYER.get(), lang), window.NSG_TEXTS.playerDescriptions[lang][index]);
  }
  assert.equal(window.NSG_PLAYER.set('Otro').description, 0);
  assert.equal(window.NSG_PLAYER.set('!!!'), null);
});

test('player descriptions: same numbering in five languages, short Latin text in es/en/fr', () => {
  const { playerDescriptions } = load().NSG_TEXTS;
  assert.deepEqual(Object.keys(playerDescriptions).sort(), ['en', 'es', 'fr', 'ru', 'zh-Hans']);
  const sizes = new Set(Object.values(playerDescriptions).map((list) => list.length));
  assert.equal(sizes.size, 1);
  assert.ok([...sizes][0] >= 30);
  for (const lang of ['es', 'en', 'fr']) {
    for (const text of playerDescriptions[lang]) {
      assert.ok(text.split(' ').length <= 3, `${lang}: ${text}`);
      assert.match(text, /^[A-Za-zÀ-ÖØ-öø-ÿŒœ'’ -]+$/, `${lang}: ${text}`);
    }
  }
  for (const [lang, script] of [['ru', /\p{Script=Cyrillic}/u], ['zh-Hans', /\p{Script=Han}/u]]) {
    assert.ok(playerDescriptions[lang].every((text) => script.test(text)), lang);
  }
  for (const list of Object.values(playerDescriptions)) assert.equal(new Set(list).size, list.length, 'no duplicates');
});

test('the name is identity: no row in Options and the step is the last setup page', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const options = html.slice(html.indexOf('id="options-menu"'), html.indexOf('</details>', html.indexOf('id="options-menu"')));
  assert.doesNotMatch(options, /name|nombre/i);
  const steps = [...html.matchAll(/data-step="(\w+)" data-setup="(\w+)"/g)].map(([, step, kind]) => [step, kind]);
  assert.deepEqual(steps, [['language', 'preference'], ['music', 'preference'], ['name', 'identity']]);
});
