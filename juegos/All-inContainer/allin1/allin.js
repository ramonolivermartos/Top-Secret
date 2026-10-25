(function () {
  const WIN_POINTS = 10000;
  const LOSS_POINTS = -5000;
  const MINIMUM_POINTS = 5000;
  const REVEAL_DELAY_MS = 2100;

  const t = (key, vars) => window.NSG_I18N.t(key, vars);
  const lang = () => window.NSG_I18N.getLang();

  const panel = document.querySelector('#allin-game');
  const introOverlay = document.querySelector('#intro-overlay');
  const boxes = Array.from(document.querySelectorAll('.allin-box'));
  const boxesWrap = document.querySelector('#allin-boxes');
  const scoreDisplay = document.querySelector('#score');
  const message = document.querySelector('#message');
  const startBtn = document.querySelector('#start-btn');
  const stakeWarning = document.querySelector('#stake-warning');
  const confirmOverlay = document.querySelector('#allin-confirm');
  const confirmTitle = document.querySelector('#allin-confirm-title');
  const confirmNo = document.querySelector('#allin-confirm-no');
  const confirmYes = document.querySelector('#allin-confirm-yes');

  let mode = 'intro';
  let paused = false;
  let confirmOpen = false;
  let selectedIndex = 0;
  let selectedBox = null;
  let coinIndex = 0;
  let resultTimer = null;
  let resultTimerEnd = 0;
  let resultTimerRemaining = null;
  let background = [];
  let lastResult = null;

  function formatNumber(value) {
    const number = Math.max(0, Math.round(Number(value) || 0));
    return number.toLocaleString(lang() === 'en' ? 'en-US' : 'es-ES');
  }

  function getTotal() {
    if (!window.NSG || typeof window.NSG.getDisplayTotal !== 'function') return 0;
    return Math.max(0, Number(window.NSG.getDisplayTotal()) || 0);
  }

  function renderScore() {
    if (scoreDisplay) scoreDisplay.textContent = formatNumber(getTotal());
  }

  function setMessage(text, tone) {
    if (!message) return;
    message.textContent = text || '';
    message.classList.remove('success', 'failure');
    if (tone) message.classList.add(tone);
  }

  function hideStakeWarning() {
    if (!stakeWarning) return;
    stakeWarning.hidden = true;
    stakeWarning.textContent = '';
  }

  function showStakeWarning() {
    if (!stakeWarning) return;
    stakeWarning.textContent = t('allin.stakeRequired');
    stakeWarning.hidden = false;
    startBtn.focus({ preventScroll: true });
  }

  function setBoxLabels() {
    boxes.forEach((box, index) => {
      box.setAttribute('aria-label', t('allin.boxAria', { number: index + 1 }));
    });
  }

  function markSelected(index) {
    selectedIndex = index;
    boxes.forEach((box, boxIndex) => {
      box.classList.toggle('is-selected', boxIndex === index);
    });
  }

  function focusBox(index, options) {
    const box = boxes[index];
    if (!box) return;
    markSelected(index);
    box.focus(options);
  }

  function resetBoxes() {
    boxes.forEach((box) => {
      box.disabled = false;
      box.classList.remove('is-selected', 'is-dimmed', 'is-picked', 'is-open', 'is-winning');
    });
    // Fuerza un reinicio de las animaciones si se vuelve a jugar enseguida.
    void (boxes[0] && boxes[0].offsetWidth);
    selectedBox = null;
    markSelected(0);
  }

  function chooseCoinIndex() {
    return Math.floor(Math.random() * 3);
  }

  function applyDelta(delta) {
    if (!window.NSG) return getTotal();
    if (typeof window.NSG.applyScoreDelta === 'function') {
      return Math.max(0, Number(window.NSG.applyScoreDelta(delta)) || 0);
    }
    // Fallback defensivo: esta página siempre carga la versión de storage
    // que incluye applyScoreDelta, pero una ganancia no debe perderse.
    if (delta > 0 && typeof window.NSG.addPendingScore === 'function') {
      window.NSG.addPendingScore(delta);
    }
    return getTotal();
  }

  function startGame() {
    if (mode === 'choosing' && !panel.classList.contains('is-intro')) return;
    // Dentro de una secuencia no se apuesta nada, así que no hay mínimo.
    const inSequence = !!(window.NSG_SEQUENCE && window.NSG_SEQUENCE.isActive());
    if (!inSequence && getTotal() < MINIMUM_POINTS) {
      showStakeWarning();
      return;
    }
    hideStakeWarning();
    if (resultTimer) {
      clearTimeout(resultTimer);
      resultTimer = null;
    }
    resultTimerRemaining = null;
    mode = 'choosing';
    paused = false;
    confirmOpen = false;
    confirmOverlay.hidden = true;
    introOverlay.style.display = 'none';
    introOverlay.classList.remove('allin-result-overlay');
    panel.classList.remove('is-intro');
    if (window.NSG && typeof window.NSG.markGamePlayed === 'function') {
      window.NSG.markGamePlayed('allin');
    }
    coinIndex = chooseCoinIndex();
    selectedIndex = 0;
    lastResult = null;
    resetBoxes();
    renderScore();
    setMessage('');
    focusBox(0, { preventScroll: true });
  }

  function hideConfirm(restoreFocus) {
    if (!confirmOpen) return;
    confirmOpen = false;
    confirmOverlay.hidden = true;
    document.body.style.overflow = '';
    background.forEach(({ el, inert }) => { el.inert = inert; });
    background = [];
    if (restoreFocus) {
      mode = 'choosing';
      if (selectedBox) selectedBox.focus({ preventScroll: true });
    }
  }

  function openConfirm(index) {
    if (mode !== 'choosing' || paused || confirmOpen) return;
    selectedIndex = index;
    selectedBox = boxes[index];
    markSelected(index);
    confirmOpen = true;
    mode = 'confirming';
    confirmTitle.textContent = t('allin.confirmTitle', { number: index + 1 });
    background = [document.querySelector('main'), document.querySelector('footer')]
      .filter(Boolean)
      .map((el) => ({ el, inert: el.inert }));
    background.forEach(({ el }) => { el.inert = true; });
    document.body.style.overflow = 'hidden';
    confirmOverlay.hidden = false;
    // Por defecto se enfoca "No": abrir la caja es irreversible.
    confirmNo.focus({ preventScroll: true });
  }

  function confirmSelection() {
    if (!confirmOpen) return;
    const index = selectedIndex;
    hideConfirm(false);
    mode = 'revealing';
    revealBox(index);
  }

  function revealBox(index) {
    const box = boxes[index];
    if (!box) return;
    boxes.forEach((candidate, boxIndex) => {
      candidate.disabled = true;
      candidate.classList.toggle('is-dimmed', boxIndex !== index);
    });
    box.classList.add('is-picked', 'is-open');
    const won = index === coinIndex;
    if (won) box.classList.add('is-winning');

    const delta = won ? WIN_POINTS : LOSS_POINTS;
    const totalAfter = applyDelta(delta);
    renderScore();
    setMessage(won ? t('allin.winMessage') : t('allin.lossMessage'), won ? 'success' : 'failure');

    lastResult = { won, index, delta, totalAfter };
    scheduleEndOverlay(REVEAL_DELAY_MS);
  }

  function scheduleEndOverlay(delay) {
    resultTimerRemaining = null;
    resultTimerEnd = Date.now() + delay;
    resultTimer = setTimeout(() => {
      resultTimer = null;
      showEndOverlay(lastResult);
    }, delay);
  }

  function showEndOverlay(result) {
    if (!result || mode === 'ended') return;
    mode = 'ended';
    panel.classList.add('is-intro');
    introOverlay.classList.add('allin-result-overlay');
    introOverlay.style.display = 'flex';

    const canReplay = result.totalAfter >= MINIMUM_POINTS;
    const deltaText = result.won ? t('allin.resultWin') : t('allin.resultLoss');
    const title = result.won ? t('allin.winTitle') : t('allin.lossTitle');
    const resultMessage = result.won ? t('allin.winMessage') : t('allin.lossMessage');

    introOverlay.innerHTML = `
      <p class="allin-result-kicker">ALL IN</p>
      <h2>${title}</h2>
      <p class="allin-result-message">${resultMessage}</p>
      <p class="allin-result-delta${result.won ? '' : ' is-loss'}">${deltaText}</p>
      <p class="allin-result-total">${t('allin.resultScore', { score: formatNumber(result.totalAfter) })}</p>
      ${canReplay ? '' : `<p class="allin-result-note">${t('allin.resultNoReplay')}</p>`}
      <div class="overlay-actions">
        ${canReplay ? `<button class="btn btn-primary" id="replay-btn">${t('common.replay')}</button>` : ''}
        <button class="btn ${canReplay ? 'btn-secondary' : 'btn-primary'}" id="menu-btn">${t('common.backToMenu')}</button>
      </div>
    `;

    const replayBtn = introOverlay.querySelector('#replay-btn');
    if (replayBtn) replayBtn.addEventListener('click', startGame);
    const menuBtn = introOverlay.querySelector('#menu-btn');
    if (menuBtn) {
      menuBtn.addEventListener('click', () => {
        window.location.href = '../../../index.html';
      });
    }
    focusOverlayPrimaryButton();
    if (window.NSG_SEQUENCE) window.NSG_SEQUENCE.finish({ won: result.won, overlay: introOverlay });
  }

  function focusOverlayPrimaryButton() {
    const button = introOverlay.querySelector('.btn-primary') || introOverlay.querySelector('.btn');
    if (button) button.focus({ preventScroll: true });
  }

  function pauseForSecret() {
    if (mode === 'intro' || mode === 'ended' || paused) return false;
    paused = true;
    if (resultTimer) {
      clearTimeout(resultTimer);
      resultTimer = null;
      resultTimerRemaining = Math.max(0, resultTimerEnd - Date.now());
    }
    return true;
  }

  function resumeFromSecret() {
    if (!paused) return;
    paused = false;
    if (mode === 'revealing' && resultTimerRemaining !== null) {
      scheduleEndOverlay(resultTimerRemaining);
    }
  }

  function goToMenuOnEscape() {
    if (mode === 'intro' || mode === 'ended') {
      window.location.href = '../../../index.html';
    }
  }

  boxes.forEach((box, index) => {
    box.addEventListener('focus', () => {
      if (mode === 'choosing' && !paused) markSelected(index);
    });
    box.addEventListener('click', () => {
      if (mode !== 'choosing' || paused) return;
      openConfirm(index);
    });
  });

  boxesWrap.addEventListener('keydown', (event) => {
    if (mode !== 'choosing' || paused || confirmOpen) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      focusBox((selectedIndex + direction + boxes.length) % boxes.length, { preventScroll: true });
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      focusBox(event.key === 'Home' ? 0 : boxes.length - 1, { preventScroll: true });
    } else if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      openConfirm(selectedIndex);
    }
  });

  // Escape y el foco dentro de la confirmación tienen prioridad sobre el
  // aviso de salida. Se captura en window para adelantarse al listener de
  // documento de quit-confirm.js.
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('keydown', (event) => {
      if (!confirmOpen || event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      hideConfirm(true);
    }, true);
  }

  confirmOverlay.addEventListener('keydown', (event) => {
    if (!confirmOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      hideConfirm(true);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      event.stopPropagation();
      if (document.activeElement === confirmYes) confirmSelection();
      else hideConfirm(true);
      return;
    }
    if (!['Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    const buttons = [confirmNo, confirmYes];
    event.preventDefault();
    event.stopPropagation();
    const current = buttons.indexOf(document.activeElement);
    const backwards = event.key === 'ArrowLeft' || event.key === 'ArrowUp'
      || (event.key === 'Tab' && event.shiftKey);
    const delta = backwards ? -1 : 1;
    buttons[(current + delta + buttons.length) % buttons.length].focus({ preventScroll: true });
  });

  confirmNo.addEventListener('click', () => hideConfirm(true));
  confirmYes.addEventListener('click', confirmSelection);

  introOverlay.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const buttons = Array.from(introOverlay.querySelectorAll('.btn'));
    if (buttons.length < 2) return;
    event.preventDefault();
    const current = buttons.indexOf(document.activeElement);
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    buttons[(current + delta + buttons.length) % buttons.length].focus({ preventScroll: true });
  });

  startBtn.addEventListener('click', startGame);
  startBtn.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
    event.preventDefault();
    startGame();
  });

  if (typeof document.addEventListener === 'function') {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !confirmOpen && (mode === 'intro' || mode === 'ended')) {
        goToMenuOnEscape();
      }
    });
  }

  window.NSG_I18N.applyStaticTranslations(document);
  setBoxLabels();
  renderScore();
  if (startBtn) startBtn.focus({ preventScroll: true });

  if (window.NSG_AUDIO && window.NSG_MUSIC) window.NSG_AUDIO.initGameMusic('../../../');

  if (window.NSG_QUIT_CONFIRM) {
    window.NSG_QUIT_CONFIRM.init({
      isActive: () => mode === 'choosing',
      // No hay una puntuación de partida acumulada: el riesgo es la
      // oportunidad, no los puntos globales.
      getScore: () => 0,
      onPause: () => { paused = true; },
      onResume: () => { paused = false; },
      menuHref: '../../../index.html',
    });
  }

  window.NSG_GAME_CONTROL = {
    isActive: () => mode !== 'intro',
    pause: pauseForSecret,
    resume: resumeFromSecret,
  };

})();
