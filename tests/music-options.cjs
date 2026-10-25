const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
function harness(store = new Map(), playResult = () => Promise.resolve()) {
  function events() {
    const listeners = new Map();
    return {
      addEventListener(type, fn) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type).add(fn);
      },
      removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
      dispatch(type, event = {}) { [...(listeners.get(type) || [])].forEach((fn) => fn(event)); },
      count(type) { return listeners.get(type)?.size || 0; },
    };
  }
  const context = vm.createContext({
    window: events(),
    localStorage: { getItem: (key) => store.get(key), setItem: (key, value) => store.set(key, value) },
    document: events(),
    Audio: class {
      constructor(url) { this.src = url; this.paused = false; }
      setAttribute() {}
      play() { this.paused = false; this.playCalls = (this.playCalls || 0) + 1; return playResult(); }
      pause() { this.paused = true; }
      removeAttribute(name) { if (name === 'src') this.src = ''; }
      load() { this.loaded = true; }
    },
  });
  for (const file of ['music-data.js', 'audio.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'scripts', file), 'utf8'), context);
  }
  return context;
}

test('epic tracks resolve on disk and keep the menu track out of the game pool', () => {
  const { window } = harness();
  const epic = window.NSG_MUSIC.types.epic;
  const actual = fs.readdirSync(path.join(root, 'music', epic.folder)).filter((file) => file.endsWith('.mp3'));
  assert.deepEqual([epic.menuTrack, ...epic.gameTracks].sort(), actual.sort());
  assert.ok(!epic.gameTracks.includes(epic.menuTrack));
  const player = window.NSG_AUDIO.initMenuMusic('');
  assert.equal(decodeURIComponent(player.src), `music/epic/${epic.menuTrack}`);
  assert.equal(player.loop, true);
});

test('leaving menu or game stops audio, releases the source and cancels autoplay retries', async () => {
  for (const method of ['initMenuMusic', 'initGameMusic']) {
    const h = harness(new Map(), () => Promise.reject(new Error('autoplay blocked')));
    const player = h.window.NSG_AUDIO[method]('');
    await Promise.resolve();
    assert.equal(h.document.count('pointerdown'), 1);
    h.window.dispatch('pagehide', { persisted: false });
    assert.equal(player.paused, true);
    assert.equal(player.src, '');
    assert.equal(player.loaded, true);
    assert.equal(h.document.count('pointerdown'), 0);
    assert.equal(h.document.count('keydown'), 0);
    h.document.dispatch('keydown');
    assert.equal(player.playCalls, 1);
  }
});

test('late autoplay rejection after exit cannot register new playback listeners', async () => {
  let reject;
  const h = harness(new Map(), () => new Promise((resolve, fail) => { reject = fail; }));
  const player = h.window.NSG_AUDIO.initMenuMusic('');
  h.window.dispatch('pagehide', { persisted: false });
  reject(new Error('play interrupted'));
  await Promise.resolve();
  assert.equal(h.document.count('pointerdown'), 0);
  assert.equal(h.document.count('keydown'), 0);
  assert.equal(player.paused, true);
});

test('back-forward cache suspends and restores the same track without restarting it', () => {
  const h = harness();
  const player = h.window.NSG_AUDIO.initGameMusic('../../../');
  const src = player.src;
  player.currentTime = 18;
  h.window.dispatch('pagehide', { persisted: true });
  assert.equal(player.paused, true);
  assert.equal(player.src, src);
  h.window.dispatch('pageshow', { persisted: true });
  assert.equal(player.paused, false);
  assert.equal(player.currentTime, 18);
  assert.equal(player.src, src);
  assert.equal(player.playCalls, 2);
  h.window.dispatch('pageshow');
  assert.equal(player.playCalls, 2);
});

test('music preference persists across pages, with random game tracks and no duplicate playback', () => {
  const store = new Map([['nsg_music_type_v1', 'missing-category']]);
  const context = harness(store);
  const api = context.window.NSG_AUDIO;
  assert.equal(api.getMusicType(), 'epic');
  const menu = api.initMenuMusic('');
  api.setMusicType('epic');
  assert.equal(menu.paused, false); // Selecting the same type does not restart the theme.
  assert.equal(store.get('nsg_music_type_v1'), 'epic');
  assert.equal(harness(store).window.NSG_AUDIO.getMusicType(), 'epic');
  const tracks = context.window.NSG_MUSIC.types.epic.gameTracks;
  for (let i = 0; i < tracks.length; i += 1) {
    vm.runInContext(`Math.random = () => ${(i + 0.5) / tracks.length}`, context);
    const game = api.initGameMusic('../../../');
    assert.equal(decodeURIComponent(game.src), `../../../music/epic/${tracks[i]}`);
    assert.equal(game.loop, true);
  }
  assert.equal(menu.paused, true);
  api.setMusicType('invalid');
  assert.equal(api.getMusicType(), 'epic');
});
