(function () {
  // Identidad del jugador: se pide solo en la bienvenida y no tiene fila en Opciones
  // (ver Directives/Welcome_Setup.md). Se guarda como preferencia local, igual que
  // el idioma, y no forma parte del progreso que se guarda manualmente.
  const STORAGE_KEY = 'nsg_player_v1';
  const MAX_UNITS = 15;
  // Letras latinas con tilde, cirílico e ideogramas chinos, además de todo el ASCII imprimible.
  const ALLOWED = /^[\x20-\x7EÀ-ÖØ-öø-ÿŒœ·Ѐ-ӿ㐀-䶿一-鿿]+$/;
  // Un ideograma ocupa el ancho de dos letras: 15 unidades son 7 caracteres chinos.
  const WIDE = /[㐀-䶿一-鿿]/;

  function units(name) {
    return [...name].reduce((sum, char) => sum + (WIDE.test(char) ? 2 : 1), 0);
  }

  function clean(raw) {
    return String(raw || '').normalize('NFC').trim().replace(/\s+/g, ' ');
  }

  // Devuelve { ok, name, error } con error: empty | chars | symbols | length.
  function validate(raw) {
    const name = clean(raw);
    let error = null;
    if (!name) error = 'empty';
    else if (!ALLOWED.test(name)) error = 'chars';
    else if (!/[\p{L}\p{N}]/u.test(name)) error = 'symbols';
    else if (units(name) > MAX_UNITS) error = 'length';
    return { ok: !error, name, error };
  }

  function pool(lang) {
    const all = (window.NSG_TEXTS && window.NSG_TEXTS.playerDescriptions) || {};
    return all[lang] || all.en || [];
  }

  function get() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (data && validate(data.name).ok && Number.isInteger(data.description)) return data;
    } catch (err) { /* Sin jugador guardado. */ }
    return null;
  }

  // Conserva la descripción mientras el nombre no cambie; un nombre nuevo sortea otra.
  function set(raw) {
    const result = validate(raw);
    if (!result.ok) return null;
    const previous = get();
    const size = pool('en').length || 1;
    const description = previous && previous.name === result.name
      ? previous.description
      : Math.floor(Math.random() * size);
    const player = { name: result.name, description };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(player)); } catch (err) { /* Solo en memoria. */ }
    return player;
  }

  function describe(player, lang) {
    const list = pool(lang);
    return player && list.length ? list[player.description % list.length] : '';
  }

  function renderBadge() {
    const badge = document.querySelector('#player-badge');
    if (!badge) return;
    const player = get();
    badge.hidden = !player;
    if (!player) return;
    const lang = window.NSG_I18N.getLang();
    const description = describe(player, lang);
    badge.querySelector('.player-name').textContent = player.name;
    badge.querySelector('.player-description').textContent = description;
    badge.setAttribute('aria-label', window.NSG_I18N.t('menu.playerAriaLabel', { name: player.name, description }));
  }

  window.NSG_PLAYER = { MAX_UNITS, units, validate, get, set, describe, renderBadge };
})();
