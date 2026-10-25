const GRID = 20;
const CELL = 440 / GRID;
const WIN_LENGTH = 17;
const START_LENGTH = 4;
let winBaseScore = 70;
const PER_SEGMENT_SCORE = 6;
const MIN_LENGTH = 3;
const SHRINK_AMOUNT = 2;
const ROUND_MS = 90000;
const TICK_MS = 150;

// Los niveles difíciles incluyen ayudas sorpresa; el más alto tiene más comida.
const DIFFICULTY_TIERS = window.NSG_SNAKE_DIFFICULTY.define([
  { weight: 6, appleRange: [3, 3], bugCount: 7, baseScore: 70, bugSpeedRange: [3, 3] }, // muy fácil
  { weight: 6, appleRange: [2, 3], bugCount: 6, baseScore: 95, bugSpeedRange: [3, 3] }, // fácil-medio
  { weight: 30, appleRange: [2, 2], bugCount: 5, baseScore: 130, bugSpeedRange: [2, 3] }, // medio
  { weight: 40, appleRange: [1, 2], bugCount: 4, baseScore: 180, bugSpeedRange: [2, 2] }, // medio-difícil
  { weight: 10, appleRange: [1, 1], bugCount: 3, baseScore: 220, bugSpeedRange: [1, 2], blueApples: true }, // difícil
  { weight: 8, appleRange: [3, 4], bugCount: 3, baseScore: 300, bugSpeedRange: [1, 1], blueApples: true }, // muy difícil
]);

const canvas = document.querySelector('#board');
const ctx = canvas ? canvas.getContext('2d') : null;
const panel = document.querySelector('#snake2-game');
const difficultyDebug = window.NSG_DIFFICULTY_DEBUG.create(panel, DIFFICULTY_TIERS);
const introOverlay = document.querySelector('#intro-overlay');
const scoreDisplay = document.querySelector('#score');
const message = document.querySelector('#message');
const targetDisplay = document.querySelector('#target');
const timerBar = document.querySelector('#timer-bar');
const lengthDisplay = document.querySelector('#length');

const t = (key, vars) => window.NSG_I18N.t(key, vars);
const lang = () => window.NSG_I18N.getLang();

let segments = [];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let apples = [];
let bugs = [];
let score = 0;
let mode = 'intro';
let roundEnd = 0;
let tickCount = 0;
let gameInterval = null;
let flashTimeout = null;
let flashEnd = 0;
let paused = false;
let pauseStartedAt = 0;

// Dificultad de la partida actual (se sortea cada vez que se empieza).
let appleCount = 2;
let bugCount = 2;
let bugEveryNTicks = 2;
const powerups = window.NSG_SNAKE_POWERUPS.create(GRID, occupiedCells);

function wrap(value) {
  return ((value % GRID) + GRID) % GRID;
}

function cellsEqual(a, b) {
  return a.x === b.x && a.y === b.y;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomMapPoint() {
  return { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
}

function occupiedCells() {
  return [...segments, ...apples, ...bugs, ...powerups.cells()];
}

function randomFreeCell(exclude = []) {
  const taken = [...occupiedCells(), ...exclude];
  let cell;
  let attempts = 0;
  do {
    cell = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    attempts += 1;
  } while (taken.some((c) => cellsEqual(c, cell)) && attempts < 500);
  return cell;
}

function spawnApples() {
  apples = [];
  for (let i = 0; i < appleCount; i += 1) apples.push(randomFreeCell(apples));
}

function spawnBug(excludeBugs = []) {
  const pos = randomFreeCell(excludeBugs);
  return { x: pos.x, y: pos.y, target: randomMapPoint() };
}

function setMessage(text, kind = '') {
  message.textContent = text;
  message.className = `game-message ${kind}`.trim();
}

function flashMessage(text, kind, duration = 1200) {
  setMessage(text, kind);
  clearTimeout(flashTimeout);
  flashEnd = Date.now() + duration;
  flashTimeout = setTimeout(finishFlash, duration);
}

function finishFlash() {
  flashEnd = 0;
  if (mode === 'playing' && !paused) setMessage(t('snake.keepGoingMessage'));
}

function pickWeightedTier() {
  const total = DIFFICULTY_TIERS.reduce((sum, tier) => sum + tier.weight, 0);
  let roll = Math.random() * total;
  for (const tier of DIFFICULTY_TIERS) {
    if (roll < tier.weight) return tier;
    roll -= tier.weight;
  }
  return DIFFICULTY_TIERS[DIFFICULTY_TIERS.length - 1];
}

function rollDifficulty() {
  const tier = pickWeightedTier();
  difficultyDebug.setCurrent(tier);
  appleCount = randomInt(tier.appleRange[0], tier.appleRange[1]);
  bugCount = tier.bugCount;
  winBaseScore = tier.baseScore;
  bugEveryNTicks = randomInt(tier.bugSpeedRange[0], tier.bugSpeedRange[1]);
  powerups.reset(Boolean(tier.blueApples));
}

function resetState() {
  clearTimeout(flashTimeout);
  flashEnd = 0;
  const startX = Math.floor(GRID / 2) - 2;
  const startY = Math.floor(GRID / 2);
  segments = [
    { x: startX + 2, y: startY },
    { x: startX + 1, y: startY },
    { x: startX, y: startY },
    { x: startX - 1, y: startY },
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  scoreDisplay.textContent = score;
  rollDifficulty();
  spawnApples();
  bugs = [];
  for (let i = 0; i < bugCount; i += 1) bugs.push(spawnBug(bugs));
  tickCount = 0;
}

// Encoge la serpiente un número fijo de segmentos (sin bajar del mínimo).
// Se usa tanto para los golpes de bicho como para chocar contigo mismo.
function shrinkSnake(amount = SHRINK_AMOUNT) {
  const keep = Math.max(MIN_LENGTH, segments.length - amount);
  segments.length = Math.min(segments.length, keep);
}

function moveSnake() {
  direction = nextDirection;
  const head = segments[0];
  const newHead = { x: wrap(head.x + direction.x), y: wrap(head.y + direction.y) };
  const eatenAppleIndex = apples.findIndex((a) => cellsEqual(a, newHead));
  const willEatBlue = powerups.isAt(newHead);
  const willEatApple = eatenAppleIndex !== -1 || willEatBlue;

  // Chocar contigo mismo ya no termina la partida: solo te encoge, igual
  // que un bicho. El reloj es la única forma de que acabe la ronda.
  const bodyToCheck = willEatApple ? segments : segments.slice(0, -1);
  const selfCollision = bodyToCheck.some((seg) => cellsEqual(seg, newHead));

  segments.unshift(newHead);
  if (willEatApple) {
    flashMessage(t('snake.appleMessage'), 'success');
    if (willEatBlue) {
      powerups.consume(newHead);
    } else {
      apples.splice(eatenAppleIndex, 1);
      apples.push(randomFreeCell(apples));
    }
  } else {
    segments.pop();
    if (selfCollision) {
      shrinkSnake();
      flashMessage(t('snake.selfCollisionMessage'), 'failure');
    }
  }

  const bugIndex = findBugTouchingSnake();
  if (bugIndex !== -1) handleBugHit(bugIndex);
}

// Un bicho toca la serpiente si coincide con CUALQUIER segmento de su
// cuerpo, no solo con la cabeza.
function findBugTouchingSnake() {
  return bugs.findIndex((bug) => segments.some((seg) => cellsEqual(seg, bug)));
}

function handleBugHit(bugIndex) {
  if (powerups.isImmune()) return;
  shrinkSnake(2);
  flashMessage(t('snake2.bugMessage'), 'failure');
  bugs[bugIndex] = spawnBug(bugs.filter((_, i) => i !== bugIndex));
}

// Cada bicho camina hacia un punto aleatorio del mapa; al llegar, elige otro
// punto aleatorio nuevo. Así recorren todo el tablero en vez de quedarse
// dando vueltas en una esquina.
function moveBugs() {
  bugs = bugs.map((bug) => {
    let { target } = bug;
    if (bug.x === target.x && bug.y === target.y) target = randomMapPoint();
    const dx = target.x - bug.x;
    const dy = target.y - bug.y;
    const options = [];
    if (dx !== 0) options.push({ x: bug.x + Math.sign(dx), y: bug.y });
    if (dy !== 0) options.push({ x: bug.x, y: bug.y + Math.sign(dy) });
    const next = options.length ? options[Math.floor(Math.random() * options.length)] : bug;
    return { x: next.x, y: next.y, target };
  });
  const headHit = findBugTouchingSnake();
  if (headHit !== -1) handleBugHit(headHit);
}

function drawRoundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }
}

function render() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#d9564d';
  apples.forEach((apple) => {
    ctx.beginPath();
    ctx.arc((apple.x + 0.5) * CELL, (apple.y + 0.5) * CELL, CELL * 0.32, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#3b3f3a';
  powerups.cells().forEach((apple) => {
    ctx.fillStyle = '#278de0';
    ctx.beginPath();
    ctx.arc((apple.x + 0.5) * CELL, (apple.y + 0.5) * CELL, CELL * 0.32, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#3b3f3a';
  bugs.forEach((bug) => {
    const pad = CELL * 0.26;
    ctx.fillRect(bug.x * CELL + pad, bug.y * CELL + pad, CELL - pad * 2, CELL - pad * 2);
  });

  segments.forEach((seg, index) => {
    ctx.fillStyle = powerups.isImmune()
      ? (index === 0 ? '#1764b0' : '#278de0')
      : (index === 0 ? '#4c7a4f' : '#69a86d');
    const pad = CELL * 0.08;
    drawRoundedRect(seg.x * CELL + pad, seg.y * CELL + pad, CELL - pad * 2, CELL - pad * 2, 6);
    ctx.fill();
  });
}

function updateTimerDisplay() {
  const now = Date.now();
  const remaining = Math.max(0, roundEnd - now);
  const totalSeconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  targetDisplay.textContent = `${minutes}:${seconds}`;
  timerBar.style.width = `${(remaining / ROUND_MS) * 100}%`;
  timerBar.classList.toggle('warning', remaining <= 20000 && remaining > 10000);
  timerBar.classList.toggle('danger', remaining <= 10000);
  lengthDisplay.textContent = segments.length;
  if (remaining === 0) endGame();
}

function gameTick() {
  if (mode !== 'playing' || paused) return;
  if (Date.now() >= roundEnd) { updateTimerDisplay(); return; }
  tickCount += 1;
  powerups.update();
  moveSnake();
  if (mode !== 'playing') return;
  if (tickCount % bugEveryNTicks === 0) moveBugs();
  render();
  updateTimerDisplay();
}

function buildEndOverlay(reachedTarget) {
  const title = t('snake.finalTitle', { length: segments.length });
  const line = window.NSG_MESSAGES.random(lang(), reachedTarget ? 'victory' : 'defeat');
  introOverlay.innerHTML = `
    <h2>${title}</h2>
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

// Cuenta la longitud al terminar: base del nivel al conservar 17 segmentos,
// más 6 puntos por segmento extra. Con menos de 17, son 0 puntos.
function computeCurrentScoreEstimate() {
  return segments.length >= WIN_LENGTH ? winBaseScore + PER_SEGMENT_SCORE * (segments.length - WIN_LENGTH) : 0;
}

function endGame() {
  if (paused || mode === 'ended') return;
  clearTimeout(flashTimeout);
  mode = 'ended';
  clearInterval(gameInterval);
  const reachedTarget = segments.length >= WIN_LENGTH;
  score = computeCurrentScoreEstimate();
  scoreDisplay.textContent = score;
  if (reachedTarget && window.NSG) window.NSG.addPendingScore(score);
  setMessage(reachedTarget ? t('snake.successMessage') : t('snake.timeUpMessage'), reachedTarget ? 'success' : 'failure');
  panel.classList.add('is-intro');
  introOverlay.style.display = 'flex';
  buildEndOverlay(reachedTarget);
  if (window.NSG_SEQUENCE) window.NSG_SEQUENCE.finish({ won: reachedTarget, overlay: introOverlay });
}

function startGame() {
  panel.classList.remove('is-intro');
  introOverlay.style.display = 'none';
  if (window.NSG) window.NSG.markGamePlayed('snake2');
  resetState();
  render();
  setMessage(t('snake.difficultyIntro', { apples: appleCount, bugs: bugCount }));
  mode = 'playing';
  roundEnd = Date.now() + ROUND_MS;
  updateTimerDisplay();
  clearInterval(gameInterval);
  gameInterval = setInterval(gameTick, TICK_MS);
}

const startBtn = document.querySelector('#start-btn');
if (startBtn) startBtn.addEventListener('click', startGame);

// Para poder encadenar partidas sin ratón: el botón principal del overlay
// (empezar / jugar de nuevo) queda enfocado automáticamente, listo para
// pulsar con Enter o espacio, y las flechas ←/→ cambian entre los botones.
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

const KEY_DIRECTIONS = {
  ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 }, W: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 }, S: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 }, A: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 }, D: { x: 1, y: 0 },
};

document.addEventListener('keydown', (event) => {
  if (mode !== 'playing' || paused) return;
  const dir = KEY_DIRECTIONS[event.key];
  if (!dir) return;
  event.preventDefault();
  if (dir.x === -direction.x && dir.y === -direction.y) return;
  nextDirection = dir;
});

// Pausar/reanudar para el aviso de "salir con ESC": se para el intervalo y,
// al reanudar, se desplaza el reloj el tiempo exacto que ha estado parado.
function pauseGame() {
  powerups.pause();
  paused = true;
  pauseStartedAt = Date.now();
  clearInterval(gameInterval);
  clearTimeout(flashTimeout);
}

function resumeGame() {
  powerups.resume();
  paused = false;
  const pausedMs = Date.now() - pauseStartedAt;
  roundEnd += pausedMs;
  if (flashEnd) {
    flashEnd += pausedMs;
    flashTimeout = setTimeout(finishFlash, Math.max(0, flashEnd - Date.now()));
  }
  gameInterval = setInterval(gameTick, TICK_MS);
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
resetState();
render();
focusOverlayPrimaryButton();
if (window.NSG_AUDIO && window.NSG_MUSIC) window.NSG_AUDIO.initGameMusic('../../../');
if (window.NSG_QUIT_CONFIRM) {
  window.NSG_QUIT_CONFIRM.init({
    isActive: () => mode === 'playing',
    getScore: () => computeCurrentScoreEstimate(),
    onPause: pauseGame,
    onResume: resumeGame,
    menuHref: '../../../index.html',
  });
}
