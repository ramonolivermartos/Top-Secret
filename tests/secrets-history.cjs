// Run with: node --test tests/secrets-history.cjs
// Secrets history, the notice for several secrets at once, and the Secrets screen.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { secretsHarness } = require('./helpers/secrets-harness.cjs');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const tick = () => new Promise((resolve) => setImmediate(resolve));
// Values created inside a vm context have another realm's prototypes; compare them as plain JSON.
const plain = (value) => JSON.parse(JSON.stringify(value));
const entry = (index, threshold) => ({
  id: `secreto-${index}`, index, threshold,
  files: { es: `Textos/ES/Secrets/secreto_${String(index).padStart(3, '0')}.md`, en: `Textos/EN/Secrets/secreto_${String(index).padStart(3, '0')}.md` },
});
const five = [entry(1, 150), entry(2, 600), entry(4, 2410), entry(7, 5000), entry(9, 9000)];

test('storage keeps the secrets history at once, independent of saving the progress', () => {
  const store = new Map();
  const context = vm.createContext({
    console,
    localStorage: { getItem: (key) => (store.has(key) ? store.get(key) : null), setItem: (key, value) => store.set(key, String(value)) },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    window: {},
    Promise,
  });
  vm.runInContext(read('scripts/storage.js'), context);
  const { NSG } = context.window;
  assert.deepEqual(plain(NSG.getSecretsHistory()), []);
  assert.deepEqual(plain(NSG.addSecretsHistory(['secreto-1', 'secreto-2', 'secreto-1'])), ['secreto-1', 'secreto-2']);
  assert.deepEqual(plain(NSG.addSecretsHistory(['secreto-2', 'secreto-3'])), ['secreto-3']);
  assert.deepEqual(plain(NSG.getSecretsHistory()), ['secreto-1', 'secreto-2', 'secreto-3']);
  NSG.commitSave(); // Saving or not saving the progress never touches the history.
  assert.deepEqual(plain(NSG.getSecretsHistory()), ['secreto-1', 'secreto-2', 'secreto-3']);
  store.set('nsg_secrets_history_v1', '{not json');
  assert.deepEqual(plain(NSG.getSecretsHistory()), []);
  store.set('nsg_secrets_history_v1', JSON.stringify([1, null, 'secreto-9']));
  assert.deepEqual(plain(NSG.getSecretsHistory()), ['secreto-9']);
});

test('a single new secret opens directly; several at once show a notice first and then only the nearest', async () => {
  const single = secretsHarness({ data: five, total: 700 });
  const calls = [];
  single.window.NSG_GAME_CONTROL = { isActive: () => true, pause: () => calls.push('pause'), resume: () => calls.push('resume') };
  single.notifyScore();
  // 700 points: two thresholds crossed (150 and 600) -> already a bulk case.
  assert.match(single.node('.secrets-title').textContent, /secrets\.bulkTitle\|\{"count":2\}/);

  const one = secretsHarness({ data: five, total: 160 });
  one.window.NSG_GAME_CONTROL = { isActive: () => true, pause() {}, resume() {} };
  one.notifyScore();
  assert.match(one.node('.secrets-title').textContent, /^secrets\.title\|\{"number":1\}$/);

  const store = new Map();
  const h = secretsHarness({ data: five, total: 3000, store });
  h.window.NSG_GAME_CONTROL = { isActive: () => true, pause: () => calls.push('pause-bulk'), resume: () => calls.push('resume-bulk') };
  h.notifyScore();
  assert.equal(h.window.NSG_SECRETS.isOpen(), true);
  // All three secrets crossed (150, 600, 2410) are in the history before anything is read.
  assert.deepEqual(JSON.parse(store.get('nsg_secrets_history_v1')), ['secreto-1', 'secreto-2', 'secreto-4']);
  assert.match(h.node('.secrets-title').textContent, /secrets\.bulkTitle\|\{"count":3\}/);
  assert.match(h.node('.secrets-body').innerHTML, /&quot;number&quot;:4/); // The nearest one is secret number 4.
  h.close(); // Still loading: the notice cannot be skipped yet.
  assert.match(h.node('.secrets-title').textContent, /bulkTitle/);
  await tick();
  assert.equal(h.node('.secrets-continue').disabled, false);
  h.close(); // Continue: now the nearest secret, and only that one.
  assert.match(h.node('.secrets-title').textContent, /^secrets\.title\|\{"number":4\}$/);
  await tick();
  assert.deepEqual(plain(h.fetched), [
    'http://localhost/Textos/ES/Secrets/secreto_004.md',
    'http://localhost/Textos/ES/Secrets/secreto_004.md',
  ]);
  h.close();
  assert.equal(h.window.NSG_SECRETS.isOpen(), false);
  assert.deepEqual(calls.filter((call) => call.endsWith('-bulk')), ['pause-bulk', 'resume-bulk']);
  // Everything is in the history now: nothing opens again.
  h.setTotal(20000);
  h.notifyScore();
  assert.match(h.node('.secrets-title').textContent, /bulkTitle\|\{"count":2\}/); // Only 5000 and 9000 are new.
  assert.deepEqual(JSON.parse(store.get('nsg_secrets_history_v1')), ['secreto-1', 'secreto-2', 'secreto-4', 'secreto-7', 'secreto-9']);
});

test('the Secrets screen opens obtained secrets without pausing or checking thresholds', () => {
  const store = new Map([['nsg_secrets_history_v1', JSON.stringify(['secreto-4', 'secreto-1'])]]);
  const h = secretsHarness({ data: five, total: 0, store, viewer: true });
  assert.equal(h.subscribed(), false);
  assert.deepEqual(plain(h.window.NSG_SECRETS.getObtained().map((secret) => secret.id)), ['secreto-1', 'secreto-4']);
  assert.equal(h.window.NSG_SECRETS.openSecret('secreto-4'), true);
  assert.equal(h.window.NSG_SECRETS.isOpen(), true);
  assert.equal(h.window.NSG_SECRETS.openSecret('secreto-1'), false); // One at a time.
  h.close();
  assert.equal(h.window.NSG_SECRETS.isOpen(), false);
  assert.equal(h.window.NSG_SECRETS.openSecret('does-not-exist'), false);
});

test('cards show the title and the start of the text, cut at a word and without Markdown', () => {
  const { parseSecret } = secretsHarness({ data: five }).window.NSG_SECRETS._test;
  const text = '# **COMISIÓN** INTERNACIONAL\n\nInforme *semestral* de la presidencia. Extracto desclasificado.\n\nEl yeti existe. Desde 1961, su custodia corresponde, por turnos semestrales, a los cinco miembros.';
  const short = parseSecret(text, 400);
  assert.equal(short.title, 'COMISIÓN INTERNACIONAL');
  assert.equal(short.excerpt, 'Informe semestral de la presidencia. Extracto desclasificado. El yeti existe. Desde 1961, su custodia corresponde, por turnos semestrales, a los cinco miembros.');
  const cut = parseSecret(text, 70);
  assert.ok(cut.excerpt.endsWith('…'));
  assert.ok(cut.excerpt.length <= 71);
  assert.ok(!/\s…$/.test(cut.excerpt));
  assert.deepEqual(plain(parseSecret('', 50)), { title: '', excerpt: '' });
});

// A tiny DOM, enough to run scripts/secrets-gallery.js.
function galleryPage(count) {
  const created = new Map();
  const element = () => ({
    children: [], dataset: {}, attrs: {}, listeners: {}, hidden: false, disabled: false, textContent: '', className: '',
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = nodes; },
    setAttribute(name, value) { this.attrs[name] = value; },
    removeAttribute(name) { delete this.attrs[name]; },
    addEventListener(type, listener) { this.listeners[type] = listener; },
    focus() { this.focused = true; },
    querySelector(selector) {
      if (selector !== '.secret-card') return null;
      const item = this.children[0];
      return item ? item.children[0] : null;
    },
  });
  const named = (selector) => {
    if (!created.has(selector)) created.set(selector, element());
    return created.get(selector);
  };
  const secrets = Array.from({ length: count }, (_, i) => entry(i + 1, (i + 1) * 100));
  const opened = [];
  const window = {
    NSG_I18N: { t: (key, vars) => (vars ? `${key}|${JSON.stringify(vars)}` : key), applyStaticTranslations() {} },
    NSG_SECRETS: {
      getObtained: () => secrets,
      describe: async (secret) => ({ id: secret.id, number: secret.index, title: `Título ${secret.index}`, excerpt: 'Texto…' }),
      openSecret: (id) => { opened.push(id); return true; },
      isOpen: () => false,
      _test: { numberFor: () => 0 },
    },
  };
  const context = vm.createContext({
    window,
    document: { querySelector: named, createElement: element, addEventListener() {}, activeElement: null },
  });
  vm.runInContext(read('scripts/secrets-gallery.js'), context);
  return { window, named, opened, secrets };
}

test('the Secrets screen lists 12 cards per page in ascending order and paginates', async () => {
  const page = galleryPage(30);
  await tick(); await tick();
  const grid = page.named('#secrets-grid');
  const ids = () => grid.children.map((item) => item.children[0].dataset.secret);
  assert.equal(page.window.NSG_SECRETS_GALLERY.PAGE_SIZE, 12);
  assert.deepEqual(ids(), Array.from({ length: 12 }, (_, i) => `secreto-${i + 1}`));
  assert.equal(page.named('#secrets-pagination').hidden, false);
  assert.match(page.named('#secrets-page-status').textContent, /1 \/ 3$/);
  assert.equal(page.named('#secrets-previous').disabled, true);
  assert.match(page.named('#secrets-count').textContent, /"count":30/);
  const firstCard = grid.children[0].children[0];
  assert.match(firstCard.children[1].textContent, /Título 1/); // Title and the start of the text.
  assert.equal(firstCard.children[2].textContent, 'Texto…');
  firstCard.listeners.click();
  assert.deepEqual(page.opened, ['secreto-1']);

  page.named('#secrets-next').listeners.click();
  await tick(); await tick();
  assert.deepEqual(ids(), Array.from({ length: 12 }, (_, i) => `secreto-${i + 13}`));
  page.named('#secrets-next').listeners.click();
  await tick(); await tick();
  assert.deepEqual(ids(), Array.from({ length: 6 }, (_, i) => `secreto-${i + 25}`));
  assert.equal(page.named('#secrets-next').disabled, true);
});

test('the Secrets screen shows an empty message and no pagination without secrets', async () => {
  const page = galleryPage(0);
  await tick(); await tick();
  assert.equal(page.named('#secrets-empty').hidden, false);
  assert.equal(page.named('#secrets-pagination').hidden, true);
  assert.equal(page.named('#secrets-grid').children.length, 0);
  assert.equal(page.named('#secrets-count').textContent, '');
});

test('the menu links to the Secrets screen next to Options and the screen loads its scripts in order', () => {
  const menu = read('index.html');
  assert.ok(menu.indexOf('id="options-menu"') < menu.indexOf('id="secrets-link"'));
  assert.ok(menu.includes('href="secretos/index.html"'));
  assert.ok(read('scripts/menu.js').includes('#secrets-link'));
  const html = read('secretos/index.html');
  assert.ok(html.includes('data-secrets="viewer"'));
  const order = ['storage.js', 'localization-data.js', 'i18n.js', 'secrets-data.js', 'secrets.js', 'secrets-gallery.js'].map((file) => html.indexOf(file));
  assert.ok(order.every((index, i) => index > 0 && (!i || index > order[i - 1])));
  assert.ok(html.includes('id="secrets-grid"') && html.includes('id="secrets-pagination"') && html.includes('id="secrets-empty"'));
});
