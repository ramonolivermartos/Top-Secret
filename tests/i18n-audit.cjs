// Guards the rule "no visible text outside Textos/": every key the code asks for exists in the five
// languages, and published game pages have no static text that bypasses data-i18n.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { loadTexts } = require('./helpers/texts.cjs');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const posix = (file) => file.split(path.sep).join('/');
function walk(dir, ext, out = []) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = posix(path.join(dir, entry.name));
    if (entry.isDirectory()) walk(rel, ext, out);
    else if (ext.some((e) => entry.name.endsWith(e))) out.push(rel);
  }
  return out;
}
const sources = [...walk('juegos', ['.js', '.html']), ...walk('scripts', ['.js']), ...walk('secretos', ['.html']), 'index.html']
  .filter((file) => !/(localization|secrets|messages|music|games)-data\.js$/.test(file));

test('every literal key used by the code exists in the five languages', () => {
  const texts = loadTexts();
  const used = new Map();
  for (const file of sources) {
    const code = read(file);
    for (const match of code.matchAll(/\bt\(\s*['"`]([A-Za-z0-9_]+(?:\.[A-Za-z0-9_-]+)+)['"`]/g)) used.set(match[1], file);
    for (const match of code.matchAll(/data-i18n[a-z-]*="([A-Za-z0-9_]+(?:\.[A-Za-z0-9_-]+)+)"/g)) used.set(match[1], file);
  }
  assert.ok(used.size > 150);
  const missing = [];
  for (const [key, file] of used) {
    for (const lang of Object.keys(texts)) if (typeof texts[lang][key] !== 'string') missing.push(`${lang}:${key} (${file})`);
  }
  assert.deepEqual(missing, []);
});

test('dynamic key families are complete (maze levels, sniper places and tiers)', () => {
  const texts = loadTexts();
  const levels = require('../juegos/Laberintos/maze-levels.js').levels;
  const keys = levels.map((level) => `laberinto.level.${level.id}`);
  const sniper = read('juegos/Francotirador/francotirador/francotirador-core.js');
  for (const match of sniper.matchAll(/id:\s*'([A-Za-z]+)'/g)) {
    for (const prefix of ['place', 'tier']) if (texts.es[`francotirador.${prefix}.${match[1]}`] !== undefined) keys.push(`francotirador.${prefix}.${match[1]}`);
  }
  for (const key of keys) for (const lang of Object.keys(texts)) assert.equal(typeof texts[lang][key], 'string', `${lang} ${key}`);
  assert.ok(keys.length >= 7 + 10);
});

// Text that is intentionally not translated: brand names and symbols, or initial values that the
// game script replaces on load through a translated key.
const ALLOWED = new Set(['All', 'in', 'ALL IN', 'AC', 'Ronda 1/6', 'Caja 1', 'Caja 2', 'Caja 3']);

test('game pages have no static visible text outside data-i18n', () => {
  const pages = [...walk('juegos', ['index.html']), 'secretos/index.html'];
  assert.ok(pages.length >= 13);
  const offenders = [];
  for (const page of pages) {
    const html = read(page).replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/gi, '');
    const stack = [];
    for (const match of html.matchAll(/<\/?([a-zA-Z][\w-]*)([^>]*)>|([^<]+)/g)) {
      const chunk = match[0];
      if (match[3] !== undefined) {
        const text = match[3].replace(/&[a-z]+;|&#\d+;/g, ' ').trim();
        if (/[A-Za-zÀ-ÿА-яЁё]{2,}/.test(text) && !stack.some((s) => s.covered) && !ALLOWED.has(text) && !/^!doctype/i.test(text)) offenders.push(`${page}: "${text.slice(0, 60)}"`);
      } else if (chunk.startsWith('</')) {
        const name = match[1].toLowerCase();
        while (stack.length && stack.pop().name !== name);
      } else {
        const name = match[1].toLowerCase();
        const attrs = match[2];
        for (const attr of ['aria-label', 'placeholder', 'title', 'alt']) {
          const found = new RegExp(`\\s${attr}="([^"]*)"`).exec(attrs);
          if (found && /[A-Za-zÀ-ÿ]{2,}/.test(found[1]) && !ALLOWED.has(found[1]) && !new RegExp(`data-i18n-${attr}=`).test(attrs)) offenders.push(`${page}: ${attr}="${found[1].slice(0, 50)}"`);
        }
        if (!/^(meta|link|br|hr|img|input|source|path|circle|rect|line)$/.test(name) && !chunk.endsWith('/>')) stack.push({ name, covered: /data-i18n(-html)?=/.test(attrs) });
      }
    }
  }
  assert.deepEqual(offenders, []);
});

test('the code does not carry its own translation tables', () => {
  const offenders = [];
  for (const file of sources.filter((f) => f.endsWith('.js'))) {
    const code = read(file);
    if (/\b(es|en|fr|ru):\s*\[\s*'[^']{3,}'/.test(code) || /'zh-Hans':\s*\[\s*'/.test(code)) offenders.push(file);
  }
  assert.deepEqual(offenders, []);
});
