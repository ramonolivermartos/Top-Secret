const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
function load(store = new Map(), prepareTranslations = () => {}) {
  const context = vm.createContext({
    window: {},
    document: { documentElement: {}, querySelectorAll: () => [] },
    localStorage: { getItem: key => store.get(key), setItem: (key, value) => store.set(key, value) },
  });
  for (const file of ['localization-data.js', 'i18n.js', 'messages-data.js', 'secrets-data.js', 'games-data.js']) {
    if (file === 'i18n.js') prepareTranslations(context.window.NSG_TEXTS);
    vm.runInContext(fs.readFileSync(path.join(root, 'scripts', file), 'utf8'), context);
  }
  return context;
}

test('five languages persist across pages and translate the shared interface', () => {
  const store = new Map();
  const h = load(store);
  const names = { es: 'Opciones', en: 'Options', fr: 'Options', ru: 'Настройки', 'zh-Hans': '选项' };
  assert.equal(Object.keys(h.window.NSG_I18N.languages).length, 5);
  for (const lang of Object.keys(names)) {
    h.window.NSG_I18N.setLang(lang);
    const nextPage = load(store);
    assert.equal(nextPage.window.NSG_I18N.getLang(), lang);
    assert.equal(nextPage.window.NSG_I18N.t('menu.optionsTitle'), names[lang]);
    const source = nextPage.window.NSG_TEXTS.translations[lang];
    for (const [key, value] of Object.entries(source)) {
      assert.equal(nextPage.window.NSG_I18N.t(key), value);
    }
    nextPage.window.NSG_I18N.applyStaticTranslations(nextPage.document);
    assert.equal(nextPage.document.documentElement.lang, lang);
    assert.ok(!nextPage.window.NSG_I18N.t('secrets.title', { number: 1 }).includes('{{'));
  }
  h.window.NSG_I18N.setLang('invalid');
  assert.equal(h.window.NSG_I18N.getLang(), 'es');
});

test('pending game translations fall back to English without losing Spanish texts', () => {
  const h = load(new Map(), texts => {
    delete texts.translations.fr['games.snake.title'];
    delete texts.translations.fr['snake.rule1'];
  });
  const i18n = h.window.NSG_I18N;
  const game = h.window.NSG_GAMES.find(game => game.id === 'snake');
  i18n.setLang('es');
  assert.equal(i18n.gameText(game, 'title'), game.title.es);
  assert.equal(i18n.t('snake.rule1'), 'Mueve la serpiente con las flechas o WASD.');
  for (const lang of ['fr']) {
    i18n.setLang(lang);
    assert.equal(i18n.gameText(game, 'title'), game.title.en);
    assert.equal(i18n.t('snake.rule1'), 'Move the snake with the arrow keys or WASD.');
    assert.notEqual(i18n.t('common.backToMenu'), 'Back to menu');
  }
});

for (const lang of ['ru', 'zh-Hans', 'fr']) {
test(`${lang} covers the English catalogue and all published game cards`, () => {
  const h = load();
  const { en } = h.window.NSG_TEXTS.translations;
  const translated = h.window.NSG_TEXTS.translations[lang];
  h.window.NSG_I18N.setLang(lang);
  for (const key of Object.keys(en)) {
    assert.equal(typeof translated[key], 'string', key);
    assert.ok(translated[key].trim(), key);
    assert.equal(h.window.NSG_I18N.t(key), translated[key], key);
  }
  for (const game of h.window.NSG_GAMES.filter(game => !game.locked)) {
    for (const field of ['title', 'description']) {
      assert.equal(h.window.NSG_I18N.gameText(game, field), translated[`games.${game.id}.${field}`]);
    }
  }
});
}

test('ES is the source: every language has exactly its keys and {{variables}}', () => {
  const { translations } = load().window.NSG_TEXTS;
  const placeholders = (text) => (text.match(/{{\w+}}/g) || []).sort().join();
  assert.ok(Object.keys(translations.es).length > 300);
  for (const lang of ['en', 'fr', 'ru', 'zh-Hans']) {
    assert.deepEqual(Object.keys(translations[lang]).sort(), Object.keys(translations.es).sort(), lang);
    for (const [key, value] of Object.entries(translations.es)) {
      assert.equal(placeholders(translations[lang][key]), placeholders(value), `${lang} ${key}`);
    }
  }
});

test('the interface texts come only from the catalogue, not from i18n.js', () => {
  assert.equal(/'[a-z0-9]+\.[A-Za-z0-9.]+': '/.test(fs.readFileSync(path.join(root, 'scripts', 'i18n.js'), 'utf8')), false);
});

test('the offline fallback messages equal the ES and EN Markdown sources', () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(fs.readFileSync(path.join(root, 'scripts', 'messages-data.js'), 'utf8'), context);
  const { messages } = load().window.NSG_TEXTS;
  for (const lang of ['es', 'en']) {
    for (const kind of ['victory', 'defeat']) {
      // JSON round trip: the arrays come from different VM realms.
      assert.deepEqual(JSON.parse(JSON.stringify(context.window.NSG_MESSAGES[lang][kind])), JSON.parse(JSON.stringify(messages[lang][kind])), `${lang} ${kind}`);
    }
  }
});

test('every language uses its own 50 victory and defeat messages', () => {
  const h = load();
  for (const lang of Object.keys(h.window.NSG_I18N.languages)) {
    for (const kind of ['victory', 'defeat']) {
      const pool = h.window.NSG_MESSAGES[lang][kind];
      assert.equal(pool.length, 50);
      vm.runInContext('Math.random = () => 0', h);
      assert.equal(h.window.NSG_MESSAGES.random(lang, kind), pool[0]);
      vm.runInContext('Math.random = () => 0.999', h);
      assert.equal(h.window.NSG_MESSAGES.random(lang, kind), pool[49]);
    }
  }
});

test('every published secret has five exact Markdown versions, available offline', () => {
  const h = load();
  const secrets = h.window.NSG_SECRETS_DATA;
  assert.ok(secrets.length >= 1);
  assert.equal(secrets[0].threshold, 150);
  for (const secret of secrets) {
    for (const lang of Object.keys(h.window.NSG_I18N.languages)) {
      const file = secret.files[lang];
      assert.ok(file, `${secret.id} ${lang}`);
      assert.equal(h.window.NSG_TEXTS.secrets[file], fs.readFileSync(path.join(root, file), 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n'));
    }
    // The story text may be revised by its author; what must hold is one title line per language, all different.
    const titles = Object.keys(secret.files).map((lang) => h.window.NSG_TEXTS.secrets[secret.files[lang]].split('\n')[0].trim());
    assert.ok(titles.every(Boolean), secret.id);
    assert.equal(new Set(titles).size, titles.length, secret.id);
  }
});

test('all game pages load the catalogue before i18n and their game scripts', () => {
  const h = load();
  for (const file of ['index.html', ...h.window.NSG_GAMES.filter(g => !g.locked).map(g => g.href)]) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.ok(html.indexOf('localization-data.js') > 0, file);
    assert.ok(html.indexOf('localization-data.js') < html.indexOf('scripts/i18n.js'), file);
  }
});

test('every published game is localized: card texts in the five languages and the catalogue loaded before i18n', () => {
  const h = load();
  const games = h.window.NSG_GAMES.filter(game => !game.locked);
  assert.ok(games.length >= 12);
  for (const game of games) {
    assert.equal(game.localized, undefined, `${game.id} must not opt out of localization`);
    for (const lang of Object.keys(h.window.NSG_I18N.languages)) {
      for (const field of ['title', 'description']) {
        assert.ok(h.window.NSG_TEXTS.translations[lang][`games.${game.id}.${field}`], `${game.id} ${field} ${lang}`);
      }
    }
    const html = fs.readFileSync(path.join(root, game.href), 'utf8');
    assert.ok(html.includes('data-i18n'), game.id);
    assert.ok(html.indexOf('localization-data.js') > 0 && html.indexOf('localization-data.js') < html.indexOf('scripts/i18n.js'), game.id);
  }
});
