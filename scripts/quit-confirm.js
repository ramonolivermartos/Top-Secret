(function () {
  const t = (key, vars) => window.NSG_I18N.t(key, vars);

  let overlayEl = null;
  let config = null;
  let open = false;
  let previousFocus = null;
  let background = [];

  function buildOverlay() {
    const el = document.createElement('div');
    el.className = 'quit-confirm-overlay';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'quit-confirm-title');
    el.innerHTML = `
      <div class="quit-confirm-box">
        <h2 id="quit-confirm-title">${t('common.quitTitle')}</h2>
        <p class="quit-confirm-score-label">${t('common.quitScoreLabel')} <strong id="quit-confirm-score">0</strong></p>
        <p class="quit-confirm-warning">${t('common.quitWarning')}</p>
        <div class="overlay-actions">
          <button class="btn btn-primary" id="quit-stay-btn">${t('common.quitStay')}</button>
          <button class="btn btn-secondary" id="quit-leave-btn">${t('common.quitLeave')}</button>
        </div>
      </div>`;
    document.body.appendChild(el);

    el.querySelector('#quit-stay-btn').addEventListener('click', closeConfirm);
    el.querySelector('#quit-leave-btn').addEventListener('click', () => {
      window.location.href = config.menuHref;
    });

    // Navegación por teclado dentro del propio aviso: Escape cancela (sigue
    // jugando) y ←/→ cambian entre los dos botones, igual que en el resto
    // de overlays del proyecto.
    el.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!event.repeat) closeConfirm();
        return;
      }
      if (!['Tab', 'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      const buttons = Array.from(el.querySelectorAll('.btn'));
      event.preventDefault();
      event.stopPropagation();
      const currentIndex = buttons.indexOf(document.activeElement);
      const delta = event.key === 'ArrowLeft' || event.key === 'ArrowUp'
        || (event.key === 'Tab' && event.shiftKey) ? -1 : 1;
      const nextIndex = (currentIndex + delta + buttons.length) % buttons.length;
      buttons[nextIndex].focus();
    });

    return el;
  }

  // Devuelve true solo si el elemento puede recibir foco de forma útil. Al
  // cerrar el aviso no sirve cualquier elemento conectado: el botón de inicio
  // suele estar oculto tras empezar y `body` tiene rectángulo pero no es
  // enfocable, así que en esos casos se usa el panel como refugio.
  function isFocusable(el) {
    if (!el || !el.isConnected || el === document.body || el === document.documentElement) return false;
    if (typeof el.getClientRects === 'function' && el.getClientRects().length === 0) return false;
    return el.tabIndex >= 0;
  }

  function openConfirm() {
    if (open) return;
    previousFocus = document.activeElement;
    open = true;
    config.onPause();
    if (!overlayEl) overlayEl = buildOverlay();
    background = Array.from(document.body.children)
      .filter((el) => el !== overlayEl)
      .map((el) => ({ el, inert: el.inert }));
    background.forEach(({ el }) => { el.inert = true; });
    overlayEl.querySelector('#quit-confirm-score').textContent = config.getScore();
    // En una secuencia no se pierde «la puntuación de la partida»: se pierde todo.
    const inSequence = !!(window.NSG && typeof window.NSG.getSequence === 'function' && window.NSG.getSequence());
    overlayEl.querySelector('.quit-confirm-score-label').style.display = inSequence ? 'none' : '';
    overlayEl.querySelector('.quit-confirm-warning').textContent = inSequence ? t('sequence.quitWarning') : t('common.quitWarning');
    overlayEl.style.display = 'flex';
    // El botón que anima a seguir jugando queda preseleccionado.
    overlayEl.querySelector('#quit-stay-btn').focus();
  }

  function closeConfirm() {
    if (!open) return;
    open = false;
    overlayEl.style.display = 'none';
    background.forEach(({ el, inert }) => { el.inert = inert; });
    background = [];
    config.onResume();
    const target = isFocusable(previousFocus) ? previousFocus : document.querySelector('.panel');
    if (target) {
      if (!target.hasAttribute('tabindex') && target.matches('.panel')) target.tabIndex = -1;
      target.focus({ preventScroll: true });
    }
  }

  // config = {
  //   isActive(): true si hay una partida en curso con algo que perder,
  //   getScore(): puntuación actual en riesgo (solo para mostrarla),
  //   onPause(): el juego debe pararse (intervalos, cronómetro...),
  //   onResume(): el juego debe reanudarse exactamente donde estaba,
  //   menuHref: ruta relativa al menú principal,
  // }
  function init(userConfig) {
    config = userConfig;
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      // El secreto también usa Escape para cerrarse; no debe abrir el aviso
      // de salida mientras su card está delante.
      if (window.NSG_SECRETS && window.NSG_SECRETS.isOpen()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.repeat) return;
      if (open) {
        event.preventDefault();
        closeConfirm();
        return;
      }
      if (!config.isActive()) {
        window.location.href = config.menuHref;
        return;
      }
      event.preventDefault();
      openConfirm();
    }, true);
    document.querySelectorAll('a.back-link').forEach((link) => {
      link.addEventListener('click', (event) => {
        if (!config.isActive()) return;
        event.preventDefault();
        openConfirm();
      });
    });
  }

  window.NSG_QUIT_CONFIRM = { init };
})();
