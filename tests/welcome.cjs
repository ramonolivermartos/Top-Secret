const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');

function harness(completed = false, saved = null) {
  const elements = new Map();
  let timers = [];
  let now = 0;
  let lang = 'es';
  let musicType = 'epic';
  let plays = 0;
  let focused;
  const events = [];
  const storage = new Map(completed ? [['nsg_welcome_done_v1', 'true']] : []);
  const local = new Map(saved ? [['nsg_player_v1', JSON.stringify(saved)]] : []);
  function get(id) {
    if (!elements.has(id)) elements.set(id, {
      hidden: false, value: '', textContent: '', listeners: {}, attrs: {},
      classList: { values: new Set(), add(name) { this.values.add(name); }, remove(name) { this.values.delete(name); }, toggle() {} },
      addEventListener(name, fn) { this.listeners[name] = fn; },
      setAttribute(name, value) { this.attrs[name] = value; },
      querySelector: get,
      replaceChildren(...children) { this.children = children; },
      focus() { focused = id; },
    });
    return elements.get(id);
  }
  get('[data-step="language"]').hidden = true;
  get('[data-step="music"]').hidden = true;
  get('[data-step="name"]').hidden = true;
  get('[data-step="reveal"]').hidden = true;
  get('#menu-content').hidden = true;
  get('#player-badge').hidden = true;
  const window = {
    matchMedia: () => ({ matches: false }),
    dispatchEvent: (event) => events.push(event.type),
    NSG_I18N: {
      getLang: () => lang, setLang: (value) => { lang = value; },
      t: (key, vars) => (vars ? `${key}:${Object.values(vars).join('|')}` : key),
      applyStaticTranslations() {},
    },
    NSG_MUSIC: { types: { epic: { labelKey: 'music.epic' }, calm: { labelKey: 'music.calm' } } },
    NSG_AUDIO: { getMusicType: () => musicType, setMusicType: (value) => { musicType = value; }, initMenuMusic: () => { plays++; } },
  };
  const context = vm.createContext({
    window, document: { querySelector: get, getElementById: (id) => get(`#${id}`), createElement: () => ({}) },
    sessionStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    localStorage: { getItem: (key) => local.get(key) ?? null, setItem: (key, value) => local.set(key, value) },
    setTimeout: (fn, delay = 0) => timers.push({ fn, due: now + delay }),
    Event: class { constructor(type) { this.type = type; } },
  });
  for (const file of ['scripts/localization-data.js', 'scripts/player.js', 'scripts/welcome.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
  }
  // Runs every timer due by `until` in time order, including timers they schedule.
  function advance(ms) {
    const until = now + ms;
    for (;;) {
      const next = timers.filter((timer) => timer.due <= until).sort((a, b) => a.due - b.due)[0];
      if (!next) break;
      timers = timers.filter((timer) => timer !== next);
      now = next.due;
      next.fn();
    }
    now = until;
  }
  return { get, window, events, storage, local, advance, click: (id) => get(id).listeners.click(),
    flush: () => advance(250), plays: () => plays,
    focused: () => focused, musicType: () => musicType };
}

function submit(h, name) {
  h.get('#welcome-name').value = name;
  h.get('#welcome-name').listeners.input();
  let prevented = false;
  h.get('#welcome-name-form').listeners.submit({ preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
}

test('welcome progresses through separate pages, translates and saves choices', () => {
  const h = harness();
  assert.equal(h.plays(), 0);
  h.click('#welcome-start');
  h.flush();
  assert.equal(h.get('[data-step="splash"]').hidden, true);
  assert.equal(h.get('[data-step="language"]').hidden, false);
  for (const lang of ['es', 'en', 'fr', 'ru', 'zh-Hans']) {
    h.get('#welcome-language').value = lang;
    h.get('#welcome-language').listeners.change();
    assert.ok(h.get('#welcome-music-title').textContent.length > 5);
    assert.ok(h.get('#welcome-music-next').textContent.length > 1);
  }
  h.click('#welcome-language-next');
  h.flush();
  assert.equal(h.get('[data-step="language"]').hidden, true);
  assert.equal(h.get('[data-step="music"]').hidden, false);
  h.get('#welcome-music').value = 'calm';
  h.get('#welcome-music').listeners.change();
  assert.equal(h.musicType(), 'calm');
  h.click('#welcome-back');
  h.flush();
  h.click('#welcome-language-next');
  h.flush();
  h.click('#welcome-music-next');
  h.flush();
  assert.equal(h.get('[data-step="music"]').hidden, true);
  assert.equal(h.get('[data-step="name"]').hidden, false);
  h.click('#welcome-name-back');
  h.flush();
  assert.equal(h.get('[data-step="music"]').hidden, false);
  h.click('#welcome-music-next');
  h.flush();

  // Invalid names keep the player on the name step with a translated error.
  for (const [name, key] of [['', 'welcome.nameErrorEmpty'], ['!!!', 'welcome.nameErrorSymbols'],
    ['ABCDEFGHIJKLMNOP', 'welcome.nameErrorLength'], ['Emoji🙂', 'welcome.nameErrorChars']]) {
    submit(h, name);
    h.flush();
    assert.equal(h.get('#welcome-name-error').textContent, key);
    assert.equal(h.get('#welcome-name').attrs['aria-invalid'], 'true');
    assert.equal(h.get('[data-step="name"]').hidden, false);
  }
  assert.equal(h.local.has('nsg_player_v1'), false);

  // 1.75 s until name and description appear; 2 s more until the menu.
  submit(h, '  Ramón  ');
  submit(h, 'Ignored'); // A second submit during the sequence is ignored.
  assert.equal(h.get('#welcome-name-error').textContent, '');
  h.advance(1749);
  assert.equal(h.get('[data-step="reveal"]').hidden, false);
  assert.equal(h.get('#welcome-reveal-name').textContent, '');
  h.advance(1);
  const player = JSON.parse(h.local.get('nsg_player_v1'));
  assert.equal(player.name, 'Ramón');
  assert.equal(h.get('#welcome-reveal-name').textContent, 'Ramón');
  assert.equal(h.get('#welcome-reveal-description').textContent, h.window.NSG_TEXTS.playerDescriptions[h.window.NSG_I18N.getLang()][player.description]);
  assert.ok(h.get('#welcome-reveal').classList.values.has('is-visible'));
  h.advance(1999);
  assert.equal(h.get('#menu-content').hidden, true);
  h.advance(1);
  assert.equal(h.get('#menu-content').hidden, false);
  assert.equal(h.get('#welcome').hidden, true);
  assert.equal(h.get('#player-badge').hidden, false);
  assert.equal(h.get('.player-name').textContent, 'Ramón');
  assert.equal(h.get('.player-description').textContent, h.window.NSG_TEXTS.playerDescriptions[h.window.NSG_I18N.getLang()][player.description]);
  assert.equal(h.window.NSG_WELCOME.active, false);
  assert.equal(h.storage.get('nsg_welcome_done_v1'), 'true');
  assert.deepEqual(h.events, ['nsg:welcome-complete']);
  assert.equal(h.plays(), 1);
  assert.equal(h.focused(), 'a.game-card');
});

test('a new session offers the saved name and keeps its description', () => {
  const h = harness(false, { name: 'Ramón', description: 7 });
  assert.equal(h.get('#welcome-name').value, 'Ramón');
  submit(h, 'Ramón');
  h.advance(4000);
  assert.equal(JSON.parse(h.local.get('nsg_player_v1')).description, 7);
});

test('returning from a game skips setup in the same session and shows the badge', () => {
  const h = harness(true, { name: 'Ramón', description: 0 });
  assert.equal(h.get('#welcome').hidden, true);
  assert.equal(h.get('#menu-content').hidden, false);
  assert.equal(h.window.NSG_WELCOME.active, false);
  assert.equal(h.plays(), 0);
  assert.equal(h.get('#player-badge').hidden, false);
  assert.equal(h.get('.player-name').textContent, 'Ramón');
});
