(function () {
  const core = window.NSG_MAZE;
  const i18n = window.NSG_I18N;
  const t = (key, vars) => (i18n ? i18n.t(key, vars) : key);
  const { gameId, tiers } = window.NSG_MAZE_GAME;
  const board = document.querySelector('#maze-board');
  const ctx = board.getContext('2d');
  const timer = document.querySelector('#maze-timer');
  const roundDisplay = document.querySelector('#maze-round');
  const scoreDisplay = document.querySelector('#maze-score');
  const message = document.querySelector('#maze-message');
  const cover = document.querySelector('#maze-cover');
  const start = document.querySelector('#maze-start');
  const pauseButton = document.querySelector('#maze-pause');
  const panel = document.querySelector('.maze-panel');
  const difficultyDebug = window.NSG_DIFFICULTY_DEBUG.create(panel, tiers, 'Difficulty');
  const overlay = document.querySelector('#maze-pause-overlay');
  const resumeButton = document.querySelector('#maze-resume');
  const pauseDetail = document.querySelector('#maze-pause-detail');
  const endOverlay = document.querySelector('#maze-end-overlay');
  const replayButton = document.querySelector('#maze-replay');
  const hintLegend = document.querySelector('#maze-hint-legend');
  const controls = [...document.querySelectorAll('[data-move]')];
  const ROUNDS_TOTAL = 3;
  const ROUND_MS = 150000;
  const INTERMISSION_MS = 5000;
  const FINAL_ROUND_DELAY_MS = 2800;
  let run;
  // intro → playing → intermission → … → final → ended; pausing keeps the state.
  let state = 'intro';
  let paused = false;
  let lastSignature = '';
  let deadline = 0;
  let intermissionEnd = 0;
  let pauseAt = 0;
  let interval;
  let score = 0;
  let roundsPlayed = 0;
  let roundsWon = 0;

  function draw() {
    const { maze } = run;
    const size = board.width / maze.width;
    const center = (cell) => [(cell % maze.width + 0.5) * size, (Math.floor(cell / maze.width) + 0.5) * size];
    ctx.clearRect(0, 0, board.width, board.height);
    ctx.fillStyle = '#dde9d0';
    run.visited.forEach((cell) => ctx.fillRect(cell % maze.width * size + 3, Math.floor(cell / maze.width) * size + 3, size - 6, size - 6));
    if (maze.hint !== null) {
      const [hx, hy] = center(maze.hint); ctx.fillStyle = '#1cc8e0';
      ctx.beginPath(); ctx.arc(hx, hy, size * .18, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = '#8ba574'; ctx.lineWidth = size * 0.25; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); run.trail.forEach((cell, i) => { const [x, y] = center(cell); if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); ctx.stroke();
    ctx.strokeStyle = '#344438'; ctx.lineWidth = 3; ctx.lineCap = 'square'; ctx.beginPath();
    maze.passages.forEach((neighbors, cell) => {
      const x = cell % maze.width * size; const y = Math.floor(cell / maze.width) * size;
      if (!neighbors.includes(cell - maze.width)) { ctx.moveTo(x, y); ctx.lineTo(x + size, y); }
      if (!neighbors.includes(cell - 1) || cell % maze.width === 0) { ctx.moveTo(x, y); ctx.lineTo(x, y + size); }
    });
    ctx.moveTo(board.width, 0); ctx.lineTo(board.width, board.height); ctx.lineTo(0, board.height); ctx.stroke();
    const [ex, ey] = center(maze.exit); ctx.fillStyle = '#ce9233'; ctx.fillRect(ex - size * .25, ey - size * .25, size * .5, size * .5);
    const [px, py] = center(run.position); ctx.fillStyle = '#285f48'; ctx.beginPath(); ctx.arc(px, py, size * .25, 0, Math.PI * 2); ctx.fill();
  }

  function movementEnabled(enabled) { controls.forEach((button) => { button.disabled = !enabled; }); }
  function formatTime(ms) {
    const seconds = Math.ceil(ms / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }
  function updateHud() {
    roundDisplay.textContent = `${Math.min(roundsPlayed + 1, ROUNDS_TOTAL)}/${ROUNDS_TOTAL}`;
    scoreDisplay.textContent = score;
  }
  function startRound() {
    const tier = core.pickTier(tiers);
    const maze = core.generateForTier(tier, lastSignature);
    lastSignature = core.signature(maze);
    run = core.createRun(maze);
    difficultyDebug.setCurrent(tier);
    hintLegend.hidden = maze.hint === null;
    state = 'playing'; deadline = Date.now() + ROUND_MS;
    timer.textContent = formatTime(ROUND_MS); timer.classList.remove('urgent');
    board.hidden = false; cover.hidden = true;
    updateHud(); draw(); movementEnabled(true);
    message.textContent = t('laberinto.roundStart', { round: roundsPlayed + 1, total: ROUNDS_TOTAL, level: t(`laberinto.level.${tier.id}`), points: tier.points });
  }
  function finishRound(result) {
    if (state !== 'playing') return;
    run.status = result; roundsPlayed += 1;
    const { points } = run.maze.tier;
    if (result === 'won') { score += points; roundsWon += 1; }
    message.textContent = result === 'won' ? t('laberinto.won', { points })
      : result === 'trapped' ? t('laberinto.trapped')
        : t('laberinto.timeout');
    scoreDisplay.textContent = score;
    if (window.NSG) window.NSG.setProvisionalScore(score);
    movementEnabled(false); draw();
    state = roundsPlayed >= ROUNDS_TOTAL ? 'final' : 'intermission';
    intermissionEnd = Date.now() + (state === 'final' ? FINAL_ROUND_DELAY_MS : INTERMISSION_MS);
  }
  function tick() {
    if (paused) return;
    const now = Date.now();
    if (state === 'playing') {
      const left = Math.max(0, deadline - now);
      timer.textContent = formatTime(left);
      timer.classList.toggle('urgent', left <= 30000);
      if (!left) finishRound('timeout');
    } else if (state === 'intermission') {
      const left = Math.max(0, intermissionEnd - now);
      timer.textContent = t('laberinto.nextIn', { seconds: Math.ceil(left / 1000) });
      if (!left) startRound();
    } else if (state === 'final' && now >= intermissionEnd) {
      endGame();
    }
  }
  function endGame() {
    state = 'ended'; clearInterval(interval);
    if (window.NSG) window.NSG.settleProvisionalScore(score);
    pauseButton.hidden = true;
    const kind = roundsWon >= Math.ceil(ROUNDS_TOTAL / 2) ? 'victory' : 'defeat';
    document.querySelector('#maze-end-detail').textContent = t('laberinto.endDetail', { won: roundsWon, total: ROUNDS_TOTAL, score });
    document.querySelector('#maze-end-flavor').textContent = window.NSG_MESSAGES ? window.NSG_MESSAGES.random(i18n ? i18n.getLang() : 'en', kind) : '';
    endOverlay.style.display = 'flex';
    replayButton.focus({ preventScroll: true });
    if (window.NSG_SEQUENCE) window.NSG_SEQUENCE.finish({ won: roundsWon === ROUNDS_TOTAL, overlay: endOverlay });
  }
  function startGame() {
    endOverlay.style.display = 'none';
    if (window.NSG) { window.NSG.markGamePlayed(gameId); window.NSG.setProvisionalScore(0); }
    score = 0; roundsPlayed = 0; roundsWon = 0; paused = false;
    start.hidden = true; pauseButton.hidden = false; pauseButton.disabled = false;
    startRound();
    pauseButton.focus({ preventScroll: true });
    clearInterval(interval); interval = setInterval(tick, 100); tick();
  }
  function isActive() { return state === 'playing' || state === 'intermission' || state === 'final'; }
  function pause() {
    tick();
    if (!isActive() || paused) return false;
    paused = true; pauseAt = Date.now(); clearInterval(interval);
    pauseDetail.textContent = window.NSG_SEQUENCE && window.NSG_SEQUENCE.isActive()
      ? t('laberinto.pausedSequence')
      : t('laberinto.pausedLeave', { score });
    panel.classList.add('is-paused'); overlay.hidden = false;
    movementEnabled(false); pauseButton.disabled = true; resumeButton.focus();
    return true;
  }
  function resume() {
    if (!paused) return;
    const pausedMs = Date.now() - pauseAt;
    deadline += pausedMs; intermissionEnd += pausedMs; paused = false;
    overlay.hidden = true; panel.classList.remove('is-paused');
    movementEnabled(state === 'playing'); pauseButton.disabled = false; pauseButton.focus();
    interval = setInterval(tick, 100); tick();
  }
  function move(dx, dy) {
    tick();
    if (state !== 'playing' || paused) return;
    if (!core.move(run, dx, dy)) { message.textContent = t('laberinto.blocked'); return; }
    message.textContent = t('laberinto.keepGoing');
    draw();
    if (run.status !== 'playing') finishRound(run.status);
  }

  start.addEventListener('click', () => { if (state === 'intro') startGame(); });
  replayButton.addEventListener('click', startGame);
  controls.forEach((button) => button.addEventListener('click', () => move(...button.dataset.move.split(',').map(Number))));
  pauseButton.addEventListener('click', pause); resumeButton.addEventListener('click', resume);
  document.querySelector('#back-link').addEventListener('click', (event) => {
    if (isActive()) { event.preventDefault(); pause(); }
  });
  const keys = { ArrowUp: [0, -1], ArrowRight: [1, 0], ArrowDown: [0, 1], ArrowLeft: [-1, 0], w: [0, -1], d: [1, 0], s: [0, 1], a: [-1, 0] };
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { event.preventDefault(); if (paused) resume(); else pause(); return; }
    if (state === 'ended' && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      const buttons = [...endOverlay.querySelectorAll('.btn')];
      event.preventDefault();
      buttons[(buttons.indexOf(document.activeElement) + 1) % buttons.length].focus();
      return;
    }
    const direction = keys[event.key] || keys[event.key.toLowerCase()];
    if (direction && state === 'playing' && !paused) { event.preventDefault(); if (!event.repeat) move(...direction); }
    if (event.key === 'Tab' && paused) {
      const leave = overlay.querySelector('a');
      event.preventDefault(); (document.activeElement === resumeButton ? leave : resumeButton).focus();
    }
  });
  window.NSG_GAME_CONTROL = { isActive, pause, resume };
  window.addEventListener('pagehide', () => { if (isActive()) pause(); });
  if (i18n) i18n.applyStaticTranslations(document);
  board.hidden = true; cover.hidden = false;
  updateHud(); movementEnabled(false); start.focus();
  if (window.NSG_AUDIO && window.NSG_MUSIC) window.NSG_AUDIO.initGameMusic('../../../');
})();
