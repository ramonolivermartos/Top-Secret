(function () {
  const SAVE_KEY = 'nsg_save_v1';
  const PENDING_KEY = 'nsg_pending_v1';
  const SEQUENCE_KEY = 'nsg_sequence_v1';
  const SECRETS_HISTORY_KEY = 'nsg_secrets_history_v1';
  const TARGET_SCORE = 1000000;
  const scoreStateListeners = new Set();
  let provisionalScore = 0;
  let scoreStateQueued = false;

  function defaultSave() {
    return { totalScore: 0, playedGames: [] };
  }

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultSave();
      const parsed = JSON.parse(raw);
      return {
        totalScore: Number.isFinite(parsed.totalScore) ? parsed.totalScore : 0,
        playedGames: Array.isArray(parsed.playedGames) ? parsed.playedGames : [],
      };
    } catch (err) {
      console.warn('[nsg] no se pudo leer el guardado, se crea uno nuevo', err);
      return defaultSave();
    }
  }

  function writeSave(save) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  }

  function getPendingScore() {
    const raw = sessionStorage.getItem(PENDING_KEY);
    const value = raw ? Number(raw) : 0;
    return Number.isFinite(value) ? value : 0;
  }

  function setPendingScore(value) {
    sessionStorage.setItem(PENDING_KEY, String(Math.max(0, Math.round(value))));
  }

  // Estado de la «Secuencia millonaria» (ver scripts/sequence.js). Vive en
  // sessionStorage: sobrevive a la navegación entre minijuegos, no a cerrar la
  // pestaña. Mientras existe, los minijuegos no suman ni restan puntos propios:
  // solo se paga el resultado de la secuencia con awardSequencePoints().
  function getSequence() {
    try {
      const raw = sessionStorage.getItem(SEQUENCE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && Array.isArray(parsed.games) ? parsed : null;
    } catch (err) {
      return null;
    }
  }

  function saveSequence(sequence) {
    try { sessionStorage.setItem(SEQUENCE_KEY, JSON.stringify(sequence)); } catch (err) { /* Sin sesión: no hay secuencia. */ }
    return sequence;
  }

  function updateSequence(patch) {
    const current = getSequence();
    return current ? saveSequence(Object.assign({}, current, patch)) : null;
  }

  function clearSequence() {
    try { sessionStorage.removeItem(SEQUENCE_KEY); } catch (err) { /* Nada que borrar. */ }
  }

  function getSecretsTotal() {
    return getDisplayTotal() + provisionalScore;
  }

  // Historial permanente de secretos obtenidos (ids). Se guarda en el momento y
  // no depende de "Guardar progreso": un secreto desvelado no se pierde aunque
  // se cierre sin guardar. Lo consulta y rellena el módulo de secretos.
  function getSecretsHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SECRETS_HISTORY_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
    } catch (err) {
      return [];
    }
  }

  // Añade ids al historial y devuelve solo los que eran nuevos.
  function addSecretsHistory(ids) {
    const history = getSecretsHistory();
    const added = [...new Set(Array.isArray(ids) ? ids : [])]
      .filter((id) => typeof id === 'string' && id && !history.includes(id));
    if (!added.length) return [];
    try {
      localStorage.setItem(SECRETS_HISTORY_KEY, JSON.stringify(history.concat(added)));
    } catch (err) {
      console.warn('[nsg] no se pudo guardar el historial de secretos', err);
    }
    return added;
  }

  // Consolidates several synchronous score updates and notifies subscribers
  // after the game has finished updating its visible state.
  function notifyScoreState() {
    if (scoreStateQueued) return;
    scoreStateQueued = true;
    Promise.resolve().then(() => {
      scoreStateQueued = false;
      const state = { total: getSecretsTotal(), displayTotal: getDisplayTotal() };
      scoreStateListeners.forEach((listener) => {
        try {
          listener(state);
        } catch (err) {
          console.warn('[nsg] error in score-state listener', err);
        }
      });
    });
  }

  function subscribeScoreState(listener) {
    if (typeof listener !== 'function') return () => {};
    scoreStateListeners.add(listener);
    return () => scoreStateListeners.delete(listener);
  }

  // Temporary points from the current game, used to detect global thresholds
  // immediately without persisting a round that the player may abandon.
  function setProvisionalScore(amount) {
    if (getSequence()) return getSecretsTotal();
    const next = Math.max(0, Math.round(Number(amount) || 0));
    if (next === provisionalScore) return getSecretsTotal();
    provisionalScore = next;
    notifyScoreState();
    return getSecretsTotal();
  }

  // Transfers the current game's final points into session-pending points
  // without counting them twice during threshold checks.
  function settleProvisionalScore(amount) {
    const value = Math.max(0, Math.round(Number(amount) || 0));
    provisionalScore = 0;
    if (value && !getSequence()) setPendingScore(getPendingScore() + value);
    notifyScoreState();
    return getPendingScore();
  }

  // Puntos ganados en la sesión actual que todavía no se han confirmado con
  // "Guardar progreso". Viven en sessionStorage a propósito: si cierras la
  // pestaña sin guardar, se pierden, igual que una partida sin guardar en un
  // juego de verdad. El total ya guardado vive en localStorage.
  function addPendingScore(amount) {
    if (!amount || getSequence()) return getPendingScore();
    const next = getPendingScore() + amount;
    setPendingScore(next);
    notifyScoreState();
    return next;
  }

  // Único camino para cobrar el premio de una secuencia ganada.
  function awardSequencePoints(amount) {
    const value = Math.max(0, Math.round(Number(amount) || 0));
    if (!value) return getPendingScore();
    setPendingScore(getPendingScore() + value);
    notifyScoreState();
    return getPendingScore();
  }

  // Aplica una ganancia o pérdida al total visible. La pérdida se descuenta
  // primero de los puntos pendientes y luego del guardado; el total nunca
  // queda por debajo de cero. Pensado para juegos de azar con penalización.
  function applyScoreDelta(amount) {
    if (getSequence()) return getDisplayTotal();
    return applyDelta(amount);
  }

  // Castigo de la secuencia (perder en All in): resta del total real aunque
  // haya una secuencia en marcha. Nunca baja de cero.
  function applySequencePenalty(amount) {
    const value = Math.abs(Math.round(Number(amount) || 0));
    return value ? applyDelta(-value) : getDisplayTotal();
  }

  function applyDelta(amount) {
    const delta = Math.round(Number(amount));
    if (!Number.isFinite(delta) || delta === 0) return getDisplayTotal();
    const save = loadSave();
    const pending = getPendingScore();
    const total = Math.max(0, save.totalScore + pending + delta);
    const nextPending = Math.min(total, Math.max(0, pending + delta));
    save.totalScore = total - nextPending;
    writeSave(save);
    setPendingScore(nextPending);
    notifyScoreState();
    return total;
  }

  function markGamePlayed(gameId) {
    const save = loadSave();
    if (!save.playedGames.includes(gameId)) {
      save.playedGames.push(gameId);
      writeSave(save);
    }
    // En una secuencia, empezar de verdad el minijuego que toca la compromete:
    // recargar o abandonar ya no la salva. Un juego que no es el esperado la
    // cancela.
    const sequence = getSequence();
    if (sequence) {
      const expected = sequence.games[sequence.index];
      if (expected && expected.id === gameId) updateSequence({ phase: 'playing' });
      else clearSequence();
    }
    // Entering a game is also a safe point to show a secret already earned
    // from progress made elsewhere.
    notifyScoreState();
  }

  function getDisplayTotal() {
    return loadSave().totalScore + getPendingScore();
  }

  function hasUnsavedProgress() {
    return getPendingScore() > 0;
  }

  function commitSave() {
    const save = loadSave();
    const pending = getPendingScore();
    save.totalScore += pending;
    writeSave(save);
    setPendingScore(0);
    return save.totalScore;
  }

  window.NSG = {
    TARGET_SCORE,
    loadSave,
    getPendingScore,
    addPendingScore,
    awardSequencePoints,
    applySequencePenalty,
    getSequence,
    saveSequence,
    updateSequence,
    clearSequence,
    applyScoreDelta,
    getSecretsTotal,
    getSecretsHistory,
    addSecretsHistory,
    subscribeScoreState,
    setProvisionalScore,
    settleProvisionalScore,
    markGamePlayed,
    getDisplayTotal,
    hasUnsavedProgress,
    commitSave,
  };
})();
