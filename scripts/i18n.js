(function () {
  const STORAGE_KEY = 'nsg_lang_v1';
  const DEFAULT_LANG = 'es';

  // Los textos viven en Textos/**/*.md (fuente: ES) y llegan por localization-data.js.
  const DICT = {};

  const languages = { es: 'Español', en: 'English', 'zh-Hans': '简体中文', ru: 'Русский', fr: 'Français' };
  const imported = window.NSG_TEXTS ? window.NSG_TEXTS.translations : {};
  Object.entries(imported).forEach(([lang, table]) => {
    DICT[lang] = Object.assign({}, DICT[lang], table);
  });

  function getLang() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return Object.prototype.hasOwnProperty.call(languages, stored) ? stored : DEFAULT_LANG;
  }

  function setLang(lang) {
    localStorage.setItem(STORAGE_KEY, Object.prototype.hasOwnProperty.call(languages, lang) ? lang : DEFAULT_LANG);
  }

  function t(key, vars) {
    const lang = getLang();
    const table = DICT[lang] || DICT[DEFAULT_LANG];
    let template = table[key];
    if (template === undefined) template = (DICT.en || {})[key];
    if (template === undefined) template = (DICT[DEFAULT_LANG] || {})[key];
    if (template === undefined) return key;
    if (vars) {
      Object.keys(vars).forEach((name) => {
        template = template.replace(new RegExp(`\\{\\{${name}\\}\\}`, 'g'), () => vars[name]);
      });
    }
    return template;
  }

  // Aplica las traducciones a todo lo que sea texto estático en la página:
  // [data-i18n] -> textContent, [data-i18n-html] -> innerHTML (solo para los
  // pocos textos que llevan una etiqueta tipo <strong> dentro),
  // [data-i18n-placeholder] -> atributo placeholder,
  // [data-i18n-aria-label] -> atributo aria-label.
  function applyStaticTranslations(root) {
    const scope = root || document;
    document.documentElement.lang = getLang();
    scope.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    scope.querySelectorAll('[data-i18n-html]').forEach((el) => {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });
    scope.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    scope.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label')));
    });
  }

  function gameText(game, field) {
    const key = `games.${game.id}.${field}`;
    const lang = getLang();
    const translated = (DICT[lang] || {})[key];
    if (translated !== undefined) return translated;
    const value = game[field];
    if (value && typeof value === 'object') return value[lang] || value.en || value.es || '';
    return value || '';
  }

  window.NSG_I18N = { getLang, setLang, t, applyStaticTranslations, languages, gameText };
})();
