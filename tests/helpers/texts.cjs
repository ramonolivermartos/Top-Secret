// Interface texts as the game sees them: the generated catalogue built from Textos/**/*.md.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadTexts() {
  const context = vm.createContext({ window: {} });
  const file = path.join(__dirname, '..', '..', 'scripts', 'localization-data.js');
  vm.runInContext(fs.readFileSync(file, 'utf8'), context);
  return context.window.NSG_TEXTS.translations;
}

// Keys must exist in the source language (es) and, like every other language, in en.
function missingKeys(keys) {
  const texts = loadTexts();
  return [...keys].filter((key) => typeof texts.es[key] !== 'string' || typeof texts.en[key] !== 'string');
}

module.exports = { loadTexts, missingKeys };
