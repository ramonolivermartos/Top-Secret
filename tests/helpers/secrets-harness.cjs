const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Loads scripts/secrets.js on a fake page. NSG keeps its secrets history in the same `store` map as localStorage.
function secretsHarness({ data, total = 0, language = 'es', store = new Map(), viewer = false } = {}) {
  let subscribed = false;
  let currentTotal = total;
  let scoreListener;
  let keyListener;
  const fetched = [];
  const nodes = new Map();
  function element() {
    return {
      style: {}, classList: { add() {}, remove() {} },
      setAttribute() {}, addEventListener() {}, focus() {},
      querySelector(selector) {
        if (!nodes.has(selector)) nodes.set(selector, element());
        return nodes.get(selector);
      },
    };
  }
  const context = vm.createContext({
    URL,
    console,
    fetch: async (url) => {
      fetched.push(url);
      return { ok: true, text: async () => 'Texto del secreto / Secret text' };
    },
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => { store.set(key, String(value)); },
    },
    document: {
      currentScript: { src: 'http://localhost/scripts/secrets.js' },
      baseURI: 'http://localhost/juegos/Calculadora/calculadora1/index.html',
      addEventListener(type, listener) { if (type === 'keydown') keyListener = listener; },
      body: { children: [], appendChild() {}, classList: { add() {}, remove() {} }, dataset: viewer ? { secrets: 'viewer' } : {} },
      querySelector: () => null,
      createElement: element,
    },
    window: {
      NSG_I18N: {
        t: (key, vars = {}) => (key === 'secrets.loadError' ? 'load-error'
          : (Object.keys(vars).length ? `${key}|${JSON.stringify(vars)}` : key)),
        getLang: () => language,
      },
      NSG: {
        getDisplayTotal: () => currentTotal,
        subscribeScoreState(listener) { subscribed = true; scoreListener = listener; },
        getSecretsHistory: () => JSON.parse(store.get('nsg_secrets_history_v1') || '[]'),
        addSecretsHistory(ids) {
          const history = JSON.parse(store.get('nsg_secrets_history_v1') || '[]');
          const added = ids.filter((id) => !history.includes(id));
          store.set('nsg_secrets_history_v1', JSON.stringify(history.concat(added)));
          return added;
        },
      },
    },
  });

  if (data) {
    context.window.NSG_SECRETS_DATA = data;
  } else {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '..', 'scripts/secrets-data.js'), 'utf8'), context);
  }
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '..', 'scripts/secrets.js'), 'utf8'), context);

  return {
    window: context.window,
    node: (selector) => nodes.get(selector),
    subscribed: () => subscribed,
    store,
    fetched,
    notifyScore: () => scoreListener(),
    close: () => keyListener({ key: 'Escape', preventDefault() {}, stopImmediatePropagation() {} }),
    setTotal: (value) => { currentTotal = value; },
  };
}

module.exports = { secretsHarness };
