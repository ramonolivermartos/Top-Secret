(function () {
  // Historial permanente de secretos obtenidos (NSG.getSecretsHistory): un secreto
  // ya obtenido no vuelve a saltar; se relee desde la pantalla de Secretos.
  // `memoryHistory` solo sirve si NSG no ofrece historial (páginas sin storage.js).
  const memoryHistory = new Set();
  // A partir de este número de secretos nuevos a la vez se avisa y solo se muestra el más cercano.
  const BULK_MIN = 2;
  const viewerMode = Boolean(document.body && document.body.dataset && document.body.dataset.secrets === 'viewer');
  const secrets = Array.isArray(window.NSG_SECRETS_DATA) ? window.NSG_SECRETS_DATA : [];
  const sortedSecrets = secrets
    .filter((secret) => secret && secret.id && Number.isFinite(Number(secret.threshold)))
    .sort((a, b) => {
      const thresholdDiff = Number(a.threshold) - Number(b.threshold);
      return thresholdDiff || String(a.id).localeCompare(String(b.id));
    });
  const numberById = new Map(sortedSecrets.map((secret, index) => [secret.id, secret.index || index + 1]));

  const t = (key, vars) => (window.NSG_I18N ? window.NSG_I18N.t(key, vars) : key);
  const lang = () => (window.NSG_I18N ? window.NSG_I18N.getLang() : 'es');
  const scriptUrl = document.currentScript && document.currentScript.src;
  // `secrets.js` vive en /scripts/, así que la raíz del proyecto está un
  // nivel por encima. Se usa la URL del propio script para que funcione
  // también si la web se sirve bajo un subdirectorio (GitHub Pages).
  const projectRoot = scriptUrl
    ? new URL('../', scriptUrl)
    : new URL('../../', document.baseURI || 'http://localhost/');

  let overlay = null;
  let titleEl = null;
  let bodyEl = null;
  let closeBtn = null;
  let active = false;
  let current = null;
  let currentLoaded = false;
  let queue = [];
  let callbacks = null;
  let pausedBySecrets = false;
  let previousFocus = null;
  let background = [];
  let loadToken = 0;
  // 'secret' muestra un relato; 'notice' el aviso de varios secretos recibidos de golpe.
  let mode = 'secret';
  let noticeReady = false;
  let nearestSecret = null;
  let continueBtn = null;

  function historyIds() {
    return window.NSG && typeof window.NSG.getSecretsHistory === 'function'
      ? window.NSG.getSecretsHistory() : [...memoryHistory];
  }

  function addHistory(ids) {
    if (window.NSG && typeof window.NSG.addSecretsHistory === 'function') return window.NSG.addSecretsHistory(ids);
    const added = ids.filter((id) => !memoryHistory.has(id));
    added.forEach((id) => memoryHistory.add(id));
    return added;
  }

  function getTotal(provisionalScore = 0) {
    const base = window.NSG
      ? Number(typeof window.NSG.getSecretsTotal === 'function'
        ? window.NSG.getSecretsTotal()
        : window.NSG.getDisplayTotal()) || 0
      : 0;
    const provisional = Number(provisionalScore);
    return base + (Number.isFinite(provisional) ? provisional : 0);
  }

  function findUnlocked(provisionalScore = 0) {
    const total = getTotal(provisionalScore);
    const obtained = new Set(historyIds());
    return sortedSecrets.filter((secret) => (
      total >= Number(secret.threshold) && !obtained.has(secret.id)
    ));
  }

  // Secretos ya obtenidos, de menor a mayor umbral.
  function getObtained() {
    const obtained = new Set(historyIds());
    return sortedSecrets.filter((secret) => obtained.has(secret.id));
  }

  // Título (primera línea) y fragmento del relato para las cards de la pantalla de Secretos.
  function parseSecret(markdown, maxChars) {
    const lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n').map((line) => line.trim()).filter(Boolean);
    const strip = (value) => value.replace(/^#{1,6}\s+/, '').replace(/[*_`>]/g, '').replace(/\s+/g, ' ').trim();
    const title = strip(lines[0] || '');
    const body = strip(lines.slice(1).join(' '));
    let excerpt = body;
    if (body.length > maxChars) {
      const cut = body.slice(0, maxChars);
      const space = cut.lastIndexOf(' ');
      excerpt = `${cut.slice(0, space > maxChars * 0.6 ? space : maxChars).replace(/[\s,.;:–-]+$/, '')}…`;
    }
    return { title, excerpt };
  }

  function describe(secret, maxChars = 150) {
    const limit = lang() === 'zh-Hans' ? Math.round(maxChars / 2) : maxChars;
    return loadSecret(secret).then((markdown) => Object.assign(
      { id: secret.id, number: numberById.get(secret.id) },
      parseSecret(markdown, limit),
    ));
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char]));
  }

  function inlineMarkdown(value) {
    let safe = escapeHtml(value);
    safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');
    safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    safe = safe.replace(/_([^_]+)_/g, '<em>$1</em>');
    return safe;
  }

  // Renderizador mínimo y seguro: no acepta HTML crudo del .md. Mantiene
  // saltos de línea dentro de un párrafo y entiende encabezados, listas y
  // citas para que los textos se puedan ampliar sin añadir dependencias.
  function renderMarkdown(source) {
    const text = String(source || '').replace(/\r\n?/g, '\n').trim();
    if (!text) return `<p class="secrets-error">${t('secrets.loadError')}</p>`;

    return text.split(/\n{2,}/).map((block) => {
      const lines = block.split('\n').filter((line) => line.trim() !== '');
      if (!lines.length) return '';

      if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
        return `<ul>${lines.map((line) => (
          `<li>${inlineMarkdown(line.replace(/^\s*[-*]\s+/, ''))}</li>`
        )).join('')}</ul>`;
      }

      if (lines.every((line) => /^\s*>\s?/.test(line))) {
        return `<blockquote>${lines.map((line) => (
          inlineMarkdown(line.replace(/^\s*>\s?/, ''))
        )).join('<br>')}</blockquote>`;
      }

      if (lines.length === 1) {
        const heading = lines[0].match(/^(#{1,3})\s+(.+)$/);
        if (heading) {
          const level = Math.min(4, heading[1].length + 1);
          return `<h${level}>${inlineMarkdown(heading[2])}</h${level}>`;
        }
      }

      return `<p>${lines.map(inlineMarkdown).join('<br>')}</p>`;
    }).join('');
  }

  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'secrets-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'secret-title');
    overlay.innerHTML = `
      <article class="secrets-card" tabindex="-1">
        <header class="secrets-header">
          <h2 class="secrets-title" id="secret-title"></h2>
          <button class="secrets-close" type="button" aria-label="${t('secrets.close')}">×</button>
        </header>
        <div class="secrets-body" tabindex="0" data-i18n-aria-label="secrets.bodyAria" aria-label="${t('secrets.bodyAria')}"></div>
        <footer class="secrets-footer">
          <span>${t('secrets.scrollHint')}</span>
          <span>${t('secrets.closeHint')}</span>
        </footer>
      </article>`;
    document.body.appendChild(overlay);
    titleEl = overlay.querySelector('.secrets-title');
    bodyEl = overlay.querySelector('.secrets-body');
    closeBtn = overlay.querySelector('.secrets-close');
    closeBtn.addEventListener('click', closeCurrent);
  }

  function setBackgroundInert() {
    background = Array.from(document.body.children)
      .filter((el) => el !== overlay)
      .map((el) => ({ el, inert: el.inert }));
    background.forEach(({ el }) => { el.inert = true; });
  }

  function restoreBackground() {
    background.forEach(({ el, inert }) => { el.inert = inert; });
    background = [];
  }

  function canFocus(el) {
    if (!el || !el.isConnected || el === document.body || el === document.documentElement) return false;
    if (typeof el.getClientRects === 'function' && el.getClientRects().length === 0) return false;
    return typeof el.focus === 'function';
  }

  function restoreFocus() {
    if (canFocus(previousFocus)) {
      previousFocus.focus({ preventScroll: true });
      return;
    }
    const panel = document.querySelector('.panel');
    if (panel) {
      if (!panel.hasAttribute('tabindex')) panel.tabIndex = -1;
      panel.focus({ preventScroll: true });
    }
  }

  function formatTitle(secret) {
    return t('secrets.title', { number: numberById.get(secret.id) });
  }

  function loadSecret(secret) {
    const files = secret.files || {};
    const file = files[lang()] || files.en || files.es;
    if (!file) return Promise.reject(new Error('missing secret file'));
    const bundled = window.NSG_TEXTS && window.NSG_TEXTS.secrets[file];
    if (typeof bundled === 'string') return Promise.resolve(bundled);
    if (typeof fetch !== 'function') return Promise.reject(new Error('fetch unavailable'));
    return fetch(new URL(file, projectRoot).href, { cache: 'no-store' }).then((response) => {
      if (!response.ok) throw new Error(`secret file ${response.status}`);
      return response.text();
    });
  }

  function showNext() {
    if (!queue.length) {
      finishBatch();
      return;
    }
    mode = 'secret';
    continueBtn = null;
    if (overlay) overlay.classList.remove('is-notice');
    current = queue.shift();
    currentLoaded = false;
    active = true;
    if (!overlay) buildOverlay();
    if (!background.length) setBackgroundInert();
    document.body.classList.add('secrets-open');
    titleEl.textContent = formatTitle(current);
    bodyEl.innerHTML = `<p class="secrets-loading">${t('secrets.loading')}</p>`;
    bodyEl.scrollTop = 0;
    overlay.style.display = 'flex';
    overlay.classList.add('is-open');
    const token = ++loadToken;
    const activeSecret = current;

    try {
      bodyEl.focus({ preventScroll: true });
    } catch (err) {
      bodyEl.focus();
    }

    loadSecret(activeSecret).then((markdown) => {
      if (!active || token !== loadToken || current !== activeSecret) return;
      bodyEl.innerHTML = renderMarkdown(markdown);
      bodyEl.scrollTop = 0;
      currentLoaded = Boolean(String(markdown || '').trim());
    }).catch((err) => {
      if (!active || token !== loadToken || current !== activeSecret) return;
      console.warn('[nsg] no se pudo cargar el secreto', err);
      bodyEl.innerHTML = `<p class="secrets-error">${t('secrets.loadError')}</p>`;
    });
  }

  // Aviso de varios secretos recibidos de golpe. El historial ya está guardado;
  // la única espera es precargar el relato más cercano, y el botón no se activa hasta entonces.
  function showNotice(count, nearest) {
    mode = 'notice';
    noticeReady = false;
    nearestSecret = nearest;
    current = nearest;
    currentLoaded = false;
    active = true;
    if (!overlay) buildOverlay();
    if (!background.length) setBackgroundInert();
    overlay.classList.add('is-notice');
    document.body.classList.add('secrets-open');
    titleEl.textContent = t('secrets.bulkTitle', { count });
    bodyEl.innerHTML = `<p>${escapeHtml(t('secrets.bulkMessage', { count, number: numberById.get(nearest.id) }))}</p>`
      + `<p class="secrets-loading">${escapeHtml(t('secrets.bulkSaving'))}</p>`
      + `<button class="btn btn-primary secrets-continue" type="button" disabled>${escapeHtml(t('secrets.bulkContinue'))}</button>`;
    bodyEl.scrollTop = 0;
    continueBtn = bodyEl.querySelector('.secrets-continue');
    continueBtn.addEventListener('click', closeCurrent);
    overlay.style.display = 'flex';
    overlay.classList.add('is-open');
    const token = ++loadToken;
    loadSecret(nearest).catch(() => null).then(() => {
      if (!active || token !== loadToken || mode !== 'notice') return;
      noticeReady = true;
      bodyEl.querySelector('.secrets-loading').textContent = t('secrets.bulkDone');
      continueBtn.disabled = false;
      continueBtn.focus();
    });
  }

  function finishBatch() {
    if (overlay) {
      overlay.style.display = 'none';
      overlay.classList.remove('is-open');
      overlay.classList.remove('is-notice');
    }
    mode = 'secret';
    continueBtn = null;
    document.body.classList.remove('secrets-open');
    restoreBackground();
    active = false;
    current = null;
    loadToken += 1;
    const resume = pausedBySecrets && callbacks && callbacks.onResume;
    pausedBySecrets = false;
    callbacks = null;
    if (typeof resume === 'function') resume();
    restoreFocus();
  }

  function closeCurrent() {
    if (!active) return;
    if (mode === 'notice') {
      // Hasta que el relato más cercano esté listo no se avanza.
      if (!noticeReady) return;
      queue = [nearestSecret];
      current = null;
      showNext();
      return;
    }
    current = null;
    currentLoaded = false;
    if (queue.length) {
      showNext();
      return;
    }
    finishBatch();
  }

  // El estado global de puntuación dispara esta comprobación compartida.
  function check(options = {}) {
    if (active) return false;
    const gameControl = window.NSG_GAME_CONTROL;
    if (!options.onPause && gameControl
      && typeof gameControl.isActive === 'function' && !gameControl.isActive()) return false;
    const unlocked = findUnlocked(options.provisionalScore || 0);
    if (!unlocked.length) return false;

    const onPause = options.onPause || (gameControl && gameControl.pause);
    const onResume = options.onResume || (gameControl && gameControl.resume);
    previousFocus = document.activeElement;
    callbacks = {
      onPause,
      onResume,
    };
    if (typeof onPause === 'function') {
      pausedBySecrets = onPause() !== false;
    }
    // Obtenidos desde este instante, aunque no se lleguen a leer: quedan en la pantalla de Secretos.
    addHistory(unlocked.map((secret) => secret.id));
    if (unlocked.length >= BULK_MIN) {
      showNotice(unlocked.length, unlocked[unlocked.length - 1]);
    } else {
      queue = unlocked.slice();
      showNext();
    }
    return true;
  }

  // Abre un secreto ya obtenido desde la pantalla de Secretos, sin pausar ningún juego.
  function openSecret(id) {
    const secret = sortedSecrets.find((entry) => entry.id === id);
    if (!secret || active) return false;
    previousFocus = document.activeElement;
    callbacks = null;
    pausedBySecrets = false;
    queue = [secret];
    showNext();
    return true;
  }

  if (!viewerMode && window.NSG && typeof window.NSG.subscribeScoreState === 'function') {
    window.NSG.subscribeScoreState(() => check());
  }

  document.addEventListener('keydown', (event) => {
    if (!active) return;

    if (event.key === 'Escape' || event.key === 'Enter') {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!event.repeat) closeCurrent();
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp'
      || event.key === 'PageDown' || event.key === 'PageUp'
      || event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!bodyEl) return;
      if (event.key === 'ArrowDown') bodyEl.scrollTop += 64;
      if (event.key === 'ArrowUp') bodyEl.scrollTop -= 64;
      if (event.key === 'PageDown') bodyEl.scrollTop += bodyEl.clientHeight * 0.85;
      if (event.key === 'PageUp') bodyEl.scrollTop -= bodyEl.clientHeight * 0.85;
      if (event.key === 'Home') bodyEl.scrollTop = 0;
      if (event.key === 'End') bodyEl.scrollTop = bodyEl.scrollHeight;
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      event.stopImmediatePropagation();
      const focusables = [continueBtn && !continueBtn.disabled ? continueBtn : null, bodyEl, closeBtn].filter(Boolean);
      if (!focusables.length) return;
      const index = focusables.indexOf(document.activeElement);
      const delta = event.shiftKey ? -1 : 1;
      const nextIndex = index === -1
        ? (event.shiftKey ? focusables.length - 1 : 0)
        : (index + delta + focusables.length) % focusables.length;
      focusables[nextIndex].focus();
    }
  }, true);

  window.NSG_SECRETS = {
    check,
    isOpen: () => active,
    getObtained,
    describe,
    openSecret,
    _test: {
      sortedSecrets,
      parseSecret,
      history: historyIds,
      numberFor: (id) => numberById.get(id),
      findUnlocked,
      getTotal,
      renderMarkdown,
    },
  };
})();
