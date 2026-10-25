// Cards «Juego aleatorio» y «Secuencia millonaria» del menú, con sus ventanas
// informativas. Las reglas de la secuencia viven en scripts/sequence.js.
(function () {
  const MINIMUM_ALL_IN = 5000;
  const t = (key, vars) => window.NSG_I18N.t(key, vars);

  let illustrationMarkup = () => '';
  let artGame = null;
  let abandoned = false;
  let modal = null;
  let opener = null;
  let background = [];

  const games = () => (window.NSG_GAMES || []).filter((game) => !game.locked && game.href);

  function renderArt() {
    const art = document.querySelector('#sequence-art');
    if (!art) return;
    if (!artGame) {
      const list = games().filter((game) => game.illustration !== 'soon');
      artGame = list[Math.floor(Math.random() * list.length)] || null;
    }
    art.innerHTML = artGame ? illustrationMarkup(artGame) : '';
  }

  function renderNotice() {
    const notice = document.querySelector('#sequence-notice');
    if (!notice) return;
    notice.hidden = !abandoned;
    notice.textContent = abandoned ? t('menu.sequence.abandoned') : '';
  }

  function closeModal() {
    if (!modal) return;
    modal.remove();
    modal = null;
    background.forEach(({ el, inert }) => { el.inert = inert; });
    background = [];
    if (opener && opener.isConnected) opener.focus();
  }

  function openModal({ title, body, onStart }) {
    opener = document.activeElement;
    modal = document.createElement('div');
    modal.className = 'mode-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'mode-modal-title');
    const box = document.createElement('div');
    box.className = 'mode-modal-box';
    const heading = document.createElement('h2');
    heading.id = 'mode-modal-title';
    heading.textContent = title;
    const actions = document.createElement('div');
    actions.className = 'overlay-actions';
    const start = document.createElement('button');
    start.type = 'button';
    start.className = 'btn btn-primary';
    start.textContent = t('menu.modeStart');
    start.addEventListener('click', onStart);
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'btn btn-secondary';
    cancel.textContent = t('menu.modeCancel');
    cancel.addEventListener('click', closeModal);
    actions.append(start, cancel);
    box.append(heading, body, actions);
    modal.appendChild(box);
    modal.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
        return;
      }
      if (!['Tab', 'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const buttons = [start, cancel];
      const back = event.key === 'ArrowLeft' || event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey);
      const index = buttons.indexOf(document.activeElement);
      buttons[(index + (back ? -1 : 1) + buttons.length) % buttons.length].focus();
    });
    background = Array.from(document.body.children).map((el) => ({ el, inert: el.inert }));
    document.body.appendChild(modal);
    background.forEach(({ el }) => { el.inert = true; });
    start.focus();
  }

  function openRandom() {
    const total = window.NSG.getDisplayTotal();
    const game = window.NSG_SEQUENCE.pickOne(window.NSG_GAMES, { canBet: total >= MINIMUM_ALL_IN });
    if (!game) return;
    const body = document.createElement('div');
    body.className = 'mode-modal-game';
    const art = document.createElement('div');
    art.className = 'mode-card-art';
    art.setAttribute('aria-hidden', 'true');
    art.innerHTML = illustrationMarkup(game);
    const name = document.createElement('h3');
    name.textContent = window.NSG_I18N.gameText(game, 'title');
    const text = document.createElement('p');
    text.textContent = window.NSG_I18N.gameText(game, 'description');
    body.append(art, name, text);
    openModal({
      title: t('menu.random.modalTitle'),
      body,
      onStart: () => { window.location.href = game.href; },
    });
  }

  function openSequence() {
    const list = document.createElement('ul');
    list.className = 'overlay-rules';
    ['rule1', 'rule2', 'rule3', 'rule4'].forEach((key) => {
      const item = document.createElement('li');
      item.textContent = t(`menu.sequence.${key}`);
      list.appendChild(item);
    });
    openModal({
      title: t('menu.sequence.modalTitle'),
      body: list,
      onStart: () => {
        const plan = window.NSG_SEQUENCE.plan(window.NSG_GAMES, { canBet: window.NSG.getDisplayTotal() >= MINIMUM_ALL_IN });
        if (!plan.length || !window.NSG_SEQUENCE.begin(plan)) return;
        window.location.href = plan[0].href;
      },
    });
  }

  function render() {
    renderArt();
    renderNotice();
  }

  function init(options) {
    illustrationMarkup = options.illustrationMarkup;
    abandoned = window.NSG_SEQUENCE.discardAbandoned();
    document.querySelector('#random-play-btn').addEventListener('click', openRandom);
    document.querySelector('#sequence-play-btn').addEventListener('click', openSequence);
  }

  window.NSG_MENU_MODES = { init, render };
})();
