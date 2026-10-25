(function () {
  const root = document.querySelector('#welcome');
  const menu = document.querySelector('#menu-content');
  const sessionKey = 'nsg_welcome_done_v1';
  let completed = false;
  try { completed = sessionStorage.getItem(sessionKey) === 'true'; } catch (err) { /* Show welcome when storage is unavailable. */ }
  window.NSG_WELCOME = { active: !completed };
  if (completed) {
    root.hidden = true;
    menu.hidden = false;
    if (window.NSG_PLAYER) window.NSG_PLAYER.renderBadge();
    return;
  }

  // Tras enviar el nombre: 1,75 s hasta mostrar nombre y descripción, 2 s más hasta el menú.
  const REVEAL_DELAY_MS = 1750;
  const MENU_DELAY_MS = 2000;
  const language = document.querySelector('#welcome-language');
  const music = document.querySelector('#welcome-music');
  const nameForm = document.querySelector('#welcome-name-form');
  const nameInput = document.querySelector('#welcome-name');
  const nameError = document.querySelector('#welcome-name-error');
  const nameCount = document.querySelector('#welcome-name-count');
  const player = window.NSG_PLAYER;
  const saved = player.get();
  if (saved) nameInput.value = saved.name;
  function render() {
    const t = window.NSG_I18N.t;
    [['welcome-start', 'welcome.begin'], ['welcome-language-title', 'welcome.languageTitle'],
      ['welcome-language-next', 'welcome.next'], ['welcome-music-title', 'welcome.musicTitle'],
      ['welcome-back', 'welcome.back'], ['welcome-finish', 'welcome.finish'],
      ['welcome-music-next', 'welcome.next'], ['welcome-name-back', 'welcome.back']].forEach(([id, key]) => {
      document.getElementById(id).textContent = t(key);
    });
    window.NSG_I18N.applyStaticTranslations(root.querySelector('[data-step="name"]'));
    updateName(false);
    language.value = window.NSG_I18N.getLang();
    document.querySelector('#welcome-language-label').textContent = window.NSG_I18N.t('menu.langAriaLabel');
    document.querySelector('#welcome-music-label').textContent = window.NSG_I18N.t('menu.musicType');
    music.replaceChildren(...Object.entries(window.NSG_MUSIC.types).map(([id, category]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = window.NSG_I18N.t(category.labelKey);
      return option;
    }));
    music.value = window.NSG_AUDIO.getMusicType();
  }

  // Contador en unidades (un ideograma chino cuenta doble) y error solo cuando se pide.
  let nameTouched = false;
  function updateName(showError) {
    const result = player.validate(nameInput.value);
    nameCount.textContent = `${player.units(result.name)}/${player.MAX_UNITS}`;
    nameCount.classList.toggle('is-over', result.error === 'length');
    const visible = !result.ok && (showError || (nameTouched && result.error !== 'empty'));
    const keys = { empty: 'welcome.nameErrorEmpty', chars: 'welcome.nameErrorChars', symbols: 'welcome.nameErrorSymbols', length: 'welcome.nameErrorLength' };
    nameError.textContent = visible ? window.NSG_I18N.t(keys[result.error]) : '';
    nameInput.setAttribute('aria-invalid', visible ? 'true' : 'false');
    return result;
  }

  function leaveMs() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 240;
  }

  let current = root.querySelector('[data-step="splash"]');
  let changing = false;
  let musicStarted = false;
  function previewMusic() {
    window.NSG_AUDIO.setMusicType(music.value);
    if (!musicStarted) {
      window.NSG_AUDIO.initMenuMusic('');
      musicStarted = true;
    }
  }
  function show(step) {
    if (changing) return;
    changing = true;
    current.inert = true;
    current.classList.add('welcome-leaving');
    const delay = leaveMs();
    setTimeout(() => {
      current.hidden = true;
      current.inert = false;
      current.classList.remove('welcome-leaving');
      if (step === 'menu') {
        try { sessionStorage.setItem(sessionKey, 'true'); } catch (err) { /* Preferences still work in memory. */ }
        window.NSG_WELCOME.active = false;
        root.hidden = true;
        menu.hidden = false;
        menu.classList.add('welcome-entering');
        player.renderBadge();
        window.dispatchEvent(new Event('nsg:welcome-complete'));
        const first = menu.querySelector('a.game-card');
        if (first) first.focus({ preventScroll: true });
      } else {
        current = root.querySelector(`[data-step="${step}"]`);
        current.hidden = false;
        const target = current.querySelector('select, input, button');
        if (target) target.focus({ preventScroll: true });
      }
      changing = false;
    }, delay);
  }
  document.querySelector('#welcome-start').addEventListener('click', () => show('language'));
  language.addEventListener('change', () => {
    window.NSG_I18N.setLang(language.value);
    render();
  });
  document.querySelector('#welcome-language-next').addEventListener('click', () => { previewMusic(); show('music'); });
  music.addEventListener('change', previewMusic);
  document.querySelector('#welcome-back').addEventListener('click', () => show('language'));
  document.querySelector('#welcome-music-next').addEventListener('click', () => { previewMusic(); show('name'); });
  document.querySelector('#welcome-name-back').addEventListener('click', () => show('music'));
  nameInput.addEventListener('input', () => { nameTouched = true; updateName(false); });
  let revealing = false;
  nameForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (revealing || changing) return;
    const result = updateName(true);
    if (!result.ok) { nameInput.focus({ preventScroll: true }); return; }
    revealing = true;
    const stored = player.set(result.name);
    show('reveal');
    setTimeout(() => {
      document.querySelector('#welcome-reveal-name').textContent = stored.name;
      document.querySelector('#welcome-reveal-description').textContent = player.describe(stored, window.NSG_I18N.getLang());
      document.querySelector('#welcome-reveal').classList.add('is-visible');
      // La animación de salida cabe dentro de los 2 s: el menú aparece justo a tiempo.
      setTimeout(() => show('menu'), MENU_DELAY_MS - leaveMs());
    }, REVEAL_DELAY_MS);
  });
  render();
  document.querySelector('#welcome-start').focus({ preventScroll: true });
})();
