// «Secuencia millonaria»: cinco minijuegos aleatorios seguidos. Este módulo
// sortea la secuencia, la guarda mediante window.NSG (sessionStorage) y adapta
// la pantalla final de cada minijuego. Contrato en skills/secuencia/SKILL.md.
(function (root) {
  const SIZE = 5;
  const PER_GAME = 5000;
  const COMPLETION_BONUS = 10000;
  const ALL_IN_ID = 'allin';
  const ALL_IN_CHANCE = 0.05;
  const ALL_IN_MINIMUM = 5000;
  // Lo acumulado antes del último juego: 4 × 5.000. Es lo que cuesta perder en All in.
  const ALL_IN_PENALTY = (SIZE - 1) * PER_GAME;
  // Si el último juego es All in y se gana, el premio total sube a esto.
  const ALL_IN_REWARD = 60000;

  function text(key, vars) {
    let value = key;
    if (root.NSG_I18N && typeof root.NSG_I18N.t === 'function') value = root.NSG_I18N.t(key);
    const lang = root.NSG_I18N && root.NSG_I18N.getLang ? root.NSG_I18N.getLang() : 'en';
    Object.keys(vars || {}).forEach((name) => {
      const raw = vars[name];
      value = value.split(`{{${name}}}`).join(typeof raw === 'number' && raw >= 1000 ? raw.toLocaleString(lang) : raw);
    });
    return value;
  }

  const playable = (games) => games.filter((game) => !game.locked && game.href);

  // Elige `size` minijuegos distintos. All in solo entra si el jugador puede
  // pagar su mínimo (`canBet`) y con un 5 % de probabilidad por secuencia; si
  // sale, es siempre el último.
  function plan(games, options = {}) {
    const random = options.random || Math.random;
    const size = options.size || SIZE;
    const pool = playable(games);
    const allIn = pool.find((game) => game.id === ALL_IN_ID);
    const others = pool.filter((game) => game.id !== ALL_IN_ID);
    const withAllIn = !!(allIn && options.canBet && random() < ALL_IN_CHANCE);
    const chosen = [];
    const target = withAllIn ? size - 1 : size;
    while (chosen.length < target && chosen.length < others.length) {
      const left = others.filter((game) => !chosen.includes(game));
      chosen.push(left[Math.floor(random() * left.length)]);
    }
    if (withAllIn) chosen.push(allIn);
    return chosen;
  }

  // Un minijuego suelto para la card de juego aleatorio. All in solo sale si
  // se pueden pagar sus 5.000 puntos mínimos (`canBet`).
  function pickOne(games, options = {}) {
    const random = options.random || Math.random;
    const pool = playable(games).filter((game) => game.id !== ALL_IN_ID);
    const allIn = playable(games).find((game) => game.id === ALL_IN_ID);
    if (allIn && options.canBet && (!pool.length || random() < ALL_IN_CHANCE)) return allIn;
    return pool[Math.floor(random() * pool.length)] || allIn || null;
  }

  const reward = (size = SIZE) => size * PER_GAME + COMPLETION_BONUS;

  function begin(games) {
    if (!root.NSG || !games.length) return null;
    return root.NSG.saveSequence({
      games: games.map((game) => ({ id: game.id, href: game.href })),
      index: 0,
      phase: 'pending',
      music: null,
    });
  }

  const isActive = () => !!(root.NSG && root.NSG.getSequence && root.NSG.getSequence());

  // Al volver al menú no puede quedar una secuencia a medias: abandonar es
  // perderla. Devuelve true si había una.
  function discardAbandoned() {
    if (!isActive()) return false;
    root.NSG.clearSequence();
    return true;
  }

  function renderBar(sequence, label) {
    const bar = document.createElement('div');
    bar.className = 'sequence-bar';
    bar.setAttribute('role', 'status');
    const title = document.createElement('strong');
    title.textContent = label || text('sequence.bar', { n: sequence.index + 1, total: sequence.games.length });
    const hint = document.createElement('span');
    hint.textContent = text('sequence.barHint');
    bar.append(title, hint);
    const current = sequence.games[sequence.index];
    if (current && current.id === ALL_IN_ID) {
      const warning = document.createElement('p');
      warning.className = 'sequence-warning';
      warning.textContent = text('sequence.allInWarning', { penalty: ALL_IN_PENALTY, reward: ALL_IN_REWARD });
      bar.appendChild(warning);
    }
    document.body.prepend(bar);
    return bar;
  }

  // Solo en páginas de juego. Una secuencia ya comprometida (el minijuego llegó
  // a empezar) no se puede retomar tras recargar la página.
  function initGamePage() {
    if (!root.document || !document.body || !document.body.classList.contains('game-page')) return;
    const sequence = root.NSG && root.NSG.getSequence && root.NSG.getSequence();
    if (!sequence) return;
    if (sequence.phase === 'playing') {
      root.NSG.clearSequence();
      return;
    }
    renderBar(sequence);
  }

  function button(label, className, onClick) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `btn ${className}`;
    el.textContent = label;
    el.addEventListener('click', onClick);
    return el;
  }

  function decorate(overlay, message, next) {
    if (!overlay) return;
    const note = document.createElement('p');
    note.className = 'sequence-result';
    note.setAttribute('role', 'status');
    note.textContent = message;
    let actions = overlay.querySelector('.overlay-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'overlay-actions';
      overlay.appendChild(actions);
    }
    actions.before(note);
    const buttons = [];
    if (next) buttons.push(button(text('sequence.next'), 'btn-primary', () => { root.location.href = `../../../${next.href}`; }));
    buttons.push(button(text('common.backToMenu'), next ? 'btn-secondary' : 'btn-primary', () => { root.location.href = '../../../index.html'; }));
    actions.replaceChildren(...buttons);
    buttons[0].focus({ preventScroll: true });
  }

  // Lo llama cada minijuego al terminar, con su pantalla final ya construida.
  // Devuelve true si hay una secuencia en marcha y este módulo ha adaptado esa
  // pantalla (el juego no debe ofrecer «jugar de nuevo»).
  function finish({ won, overlay }) {
    const sequence = root.NSG && root.NSG.getSequence && root.NSG.getSequence();
    if (!sequence || sequence.phase !== 'playing') return false;
    const total = sequence.games.length;
    if (!won) {
      const current = sequence.games[sequence.index];
      const penalized = !!(current && current.id === ALL_IN_ID);
      root.NSG.clearSequence();
      if (penalized) root.NSG.applySequencePenalty(ALL_IN_PENALTY);
      decorate(overlay, penalized ? text('sequence.lostAllIn', { penalty: ALL_IN_PENALTY }) : text('sequence.lost'));
      return true;
    }
    if (sequence.index < total - 1) {
      root.NSG.updateSequence({ index: sequence.index + 1, phase: 'pending' });
      decorate(overlay, text('sequence.passed', { done: sequence.index + 1, total }), sequence.games[sequence.index + 1]);
      return true;
    }
    const viaAllIn = sequence.games[sequence.index].id === ALL_IN_ID;
    const points = viaAllIn ? ALL_IN_REWARD : reward(total);
    root.NSG.clearSequence();
    root.NSG.awardSequencePoints(points);
    decorate(overlay, viaAllIn
      ? text('sequence.completeAllIn', { points })
      : text('sequence.complete', { points, total, each: PER_GAME, bonus: COMPLETION_BONUS }));
    return true;
  }

  const api = {
    SIZE, PER_GAME, COMPLETION_BONUS, ALL_IN_CHANCE, ALL_IN_MINIMUM, ALL_IN_PENALTY, ALL_IN_REWARD, plan, pickOne, reward, begin,
    isActive, discardAbandoned, initGamePage, finish, text,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    root.NSG_SEQUENCE = api;
    // Tras cargar i18n.js (los scripts con defer se ejecutan antes de este evento).
    if (root.document && document.readyState !== 'complete') document.addEventListener('DOMContentLoaded', initGamePage);
    else initGamePage();
  }
})(typeof window !== 'undefined' ? window : globalThis);
