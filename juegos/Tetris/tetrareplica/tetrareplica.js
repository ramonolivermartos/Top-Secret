const GAME_ID = 'tetrareplica';
const core = window.NSG_TETRA_CORE;
const { COLS, ROWS, TARGET_ROWS } = core;
const CELL = 44;
const FRAME_MS = 50;
const MAX_FRAME_MS = 250;

const canvas = document.querySelector('#board');
const ctx = canvas ? canvas.getContext('2d') : null;
const targetCanvas = document.querySelector('#target-board');
const targetCtx = targetCanvas ? targetCanvas.getContext('2d') : null;
const panel = document.querySelector('#tetra-game');
const introOverlay = document.querySelector('#intro-overlay');
const scoreDisplay = document.querySelector('#score');
const message = document.querySelector('#message');
const timeDisplay = document.querySelector('#target');
const progressBar = document.querySelector('#timer-bar');
const filledDisplay = document.querySelector('#filled');
const totalDisplay = document.querySelector('#total');
const targetCaption = document.querySelector('#target-caption');
const previewBox = document.querySelector('#preview');
const previewCount = document.querySelector('#preview-count');
const COUNT_FROM = 5; // el contador baja de 5 a 0 en los últimos segundos
const START_FLASH_MS = 700; // el 0 se queda un instante cuando caen las primeras piezas

const t = (key, vars) => window.NSG_I18N.t(key, vars);
const lang = () => window.NSG_I18N.getLang();

const figures = core.catalogue();
let figureIndex = -1;
let target = null;
let targetColors = [];
let sim = null;
let mode = 'intro'; // intro | preview | playing | ended
let previewLeft = 0;
let paused = false;
let lastFrame = 0;
let loop = null;
let score = 0;

function randomHue() {
  return `hsl(${Math.floor(Math.random() * 360)} 72% 55%)`;
}

function pickFigure() {
  let next;
  do {
    next = Math.floor(Math.random() * figures.length);
  } while (figures.length > 1 && next === figureIndex);
  figureIndex = next;
  target = core.withTiling(figures[next]);
  targetColors = new Array(COLS * ROWS).fill(null);
  target.tiling.forEach((cells) => {
    const color = randomHue();
    cells.forEach((idx) => { targetColors[idx] = color; });
  });
}

function setMessage(text, kind = '') {
  message.textContent = text;
  message.className = `game-message ${kind}`.trim();
}

function paintCell(context, x, y, color, outline) {
  const pad = 2;
  context.fillStyle = color;
  context.beginPath();
  if (typeof context.roundRect === 'function') context.roundRect(x * CELL + pad, y * CELL + pad, CELL - pad * 2, CELL - pad * 2, 8);
  else context.rect(x * CELL + pad, y * CELL + pad, CELL - pad * 2, CELL - pad * 2);
  context.fill();
  if (outline) {
    context.strokeStyle = outline;
    context.lineWidth = 3;
    context.stroke();
  }
}

function paintGrid(context, rows) {
  context.strokeStyle = 'rgba(0,0,0,0.05)';
  context.lineWidth = 1;
  context.beginPath();
  for (let x = 1; x < COLS; x += 1) { context.moveTo(x * CELL, 0); context.lineTo(x * CELL, rows * CELL); }
  for (let y = 1; y < rows; y += 1) { context.moveTo(0, y * CELL); context.lineTo(COLS * CELL, y * CELL); }
  context.stroke();
}

function renderTarget() {
  if (!targetCtx || !target) return;
  targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  paintGrid(targetCtx, TARGET_ROWS);
  const firstRow = ROWS - TARGET_ROWS;
  target.list.forEach((idx) => {
    paintCell(targetCtx, idx % COLS, Math.floor(idx / COLS) - firstRow, targetColors[idx] || '#668c68');
  });
}

function render() {
  if (!ctx || !sim) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (mode === 'preview') return; // la figura se ve sola: el tablero aún está vacío
  paintGrid(ctx, ROWS);
  const { filled, colors } = sim;
  for (let idx = 0; idx < filled.length; idx += 1) {
    if (filled[idx]) paintCell(ctx, idx % COLS, Math.floor(idx / COLS), colors[idx]);
  }
  sim.active.forEach((piece, order) => {
    core.pieceCells(piece).forEach(([x, y]) => paintCell(ctx, x, y, piece.color, order === 0 ? '#2f3a30' : 'rgba(0,0,0,0.25)'));
  });
}

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function updateHud() {
  score = sim.score();
  scoreDisplay.textContent = score;
  timeDisplay.textContent = formatTime(sim.elapsed);
  filledDisplay.textContent = sim.filledCount;
  progressBar.style.width = `${(sim.filledCount / target.count) * 100}%`;
}

// Banner superior de la cuenta atrás: texto durante la vista previa, contador de 5 a 0 al final.
function updatePreview() {
  const counting = mode === 'preview' && previewLeft <= COUNT_FROM * 1000;
  const flashing = mode === 'playing' && sim && sim.elapsed < START_FLASH_MS;
  previewBox.style.display = mode === 'preview' || flashing ? '' : 'none';
  previewCount.style.display = counting || flashing ? '' : 'none';
  if (counting) previewCount.textContent = t('tetrareplica.previewCountdown', { n: Math.ceil(previewLeft / 1000) });
  else if (flashing) previewCount.textContent = t('tetrareplica.previewCountdown', { n: 0 });
}

function beginPlay() {
  mode = 'playing';
  previewLeft = 0;
  setMessage(t('tetrareplica.readyMessage'));
  render();
}

function frame() {
  if ((mode !== 'playing' && mode !== 'preview') || paused) return;
  const now = Date.now();
  const dt = Math.min(Math.max(now - lastFrame, 0), MAX_FRAME_MS);
  lastFrame = now;
  if (mode === 'preview') {
    previewLeft -= dt;
    if (previewLeft <= 0) beginPlay();
    updatePreview();
    return;
  }
  sim.advance(dt);
  render();
  updateHud();
  updatePreview();
  if (sim.status !== 'playing') endGame();
}

function loseText() {
  if (sim.reason === 'outside') return t('tetrareplica.loseOutside');
  if (sim.reason === 'overflow') return t('tetrareplica.loseOverflow');
  return t('tetrareplica.loseUnsolvable');
}

function buildEndOverlay(won) {
  const line = window.NSG_MESSAGES.random(lang(), won ? 'victory' : 'defeat');
  const reason = won ? '' : `<p class="description" style="margin:0;max-width:none;">${loseText()}</p>`;
  introOverlay.innerHTML = `
    <h2>${won ? t('tetrareplica.winTitle') : t('tetrareplica.loseTitle')}</h2>
    ${reason}
    <p class="description" style="margin:0;max-width:none;"><strong>${t('tetrareplica.finalScore', { score })}</strong></p>
    <p class="description" style="margin:0;max-width:none;">${line}</p>
    <div class="overlay-actions">
      <button class="btn btn-primary" id="replay-btn">${t('common.replay')}</button>
      <button class="btn btn-secondary" id="menu-btn">${t('common.backToMenu')}</button>
    </div>
  `;
  document.querySelector('#replay-btn').addEventListener('click', startGame);
  document.querySelector('#menu-btn').addEventListener('click', () => {
    window.location.href = '../../../index.html';
  });
  focusOverlayPrimaryButton();
}

function endGame() {
  if (mode === 'ended') return;
  mode = 'ended';
  clearInterval(loop);
  const won = sim.status === 'won';
  updateHud();
  updatePreview();
  // Perder no da puntos: solo se acumulan al ganar.
  if (won && score > 0 && window.NSG) window.NSG.addPendingScore(score);
  setMessage(won ? t('tetrareplica.winTitle') : loseText(), won ? 'success' : 'failure');
  panel.classList.add('is-intro');
  introOverlay.style.display = 'flex';
  buildEndOverlay(won);
  if (window.NSG_SEQUENCE) window.NSG_SEQUENCE.finish({ won, overlay: introOverlay });
}

function startGame() {
  panel.classList.remove('is-intro');
  introOverlay.style.display = 'none';
  if (window.NSG) window.NSG.markGamePlayed(GAME_ID);
  pickFigure();
  sim = core.createSim({ target });
  paused = false;
  mode = 'preview';
  previewLeft = core.CONFIG.previewMs;
  targetCaption.textContent = t('tetrareplica.targetCaption', { n: target.id, total: figures.length });
  totalDisplay.textContent = target.count;
  setMessage('');
  renderTarget();
  render();
  updateHud();
  updatePreview();
  lastFrame = Date.now();
  clearInterval(loop);
  loop = setInterval(frame, FRAME_MS);
}

const startBtn = document.querySelector('#start-btn');
if (startBtn) startBtn.addEventListener('click', startGame);

function focusOverlayPrimaryButton() {
  const btn = introOverlay.querySelector('.btn-primary') || introOverlay.querySelector('.btn');
  if (btn) btn.focus();
}

introOverlay.addEventListener('keydown', (event) => {
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
  const buttons = Array.from(introOverlay.querySelectorAll('.btn'));
  if (buttons.length < 2) return;
  event.preventDefault();
  const currentIndex = buttons.indexOf(document.activeElement);
  const delta = event.key === 'ArrowRight' ? 1 : -1;
  const nextIndex = (currentIndex + delta + buttons.length) % buttons.length;
  buttons[nextIndex].focus();
});

// Entrada: teclado y botones táctiles se traducen a las mismas acciones.
const ACTIONS = {
  left: () => sim.move(-1),
  right: () => sim.move(1),
  rotate: () => sim.rotate(),
  down: () => sim.softDrop(),
  discard: () => {
    const removed = sim.discard();
    if (removed) setMessage(t('tetrareplica.discardMessage'));
    return removed;
  },
};

const KEY_ACTIONS = {
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
  ArrowUp: 'rotate', w: 'rotate', W: 'rotate',
  ArrowDown: 'down', s: 'down', S: 'down',
  k: 'discard', K: 'discard',
};

function perform(name) {
  if (mode !== 'playing' || paused || !sim) return;
  ACTIONS[name]();
  render();
}

document.addEventListener('keydown', (event) => {
  if (mode !== 'playing' || paused) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const name = KEY_ACTIONS[event.key];
  if (!name) return;
  event.preventDefault();
  perform(name);
});

document.querySelectorAll('.tetra-controls [data-action]').forEach((button) => {
  button.addEventListener('click', () => perform(button.dataset.action));
});

// Pausa: se detiene todo el reloj de la partida (caída, aparición y puntos).
function pauseGame() {
  paused = true;
  clearInterval(loop);
}

function resumeGame() {
  paused = false;
  lastFrame = Date.now();
  loop = setInterval(frame, FRAME_MS);
}

window.NSG_GAME_CONTROL = {
  isActive: () => mode !== 'intro',
  pause: () => {
    if (mode === 'ended' || paused) return false;
    pauseGame();
    return true;
  },
  resume: resumeGame,
};

window.NSG_I18N.applyStaticTranslations(document);
document.querySelector('#rule-preview').textContent = t('tetrareplica.rulePreview', { seconds: core.CONFIG.previewMs / 1000 });
pickFigure();
totalDisplay.textContent = target.count;
targetCaption.textContent = t('tetrareplica.targetCaption', { n: target.id, total: figures.length });
renderTarget();
focusOverlayPrimaryButton();
if (window.NSG_AUDIO && window.NSG_MUSIC) window.NSG_AUDIO.initGameMusic('../../../');
if (window.NSG_QUIT_CONFIRM) {
  window.NSG_QUIT_CONFIRM.init({
    isActive: () => mode === 'playing' || mode === 'preview',
    getScore: () => (sim ? sim.score() : 0),
    onPause: pauseGame,
    onResume: resumeGame,
    menuHref: '../../../index.html',
  });
}
