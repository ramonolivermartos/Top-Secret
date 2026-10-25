const ROUNDS_TOTAL = 6;
const ROUND_DURATION_MS = 10000;
const INTERMISSION_MS = 5000;
const FINAL_ROUND_DELAY_MS = 2800;
const MIN_TARGET = 500000;
const MAX_TARGET = 10000000;

const display = document.querySelector('#display');
const expression = document.querySelector('#expression');
const keys = document.querySelector('.keys');
const targetDisplay = document.querySelector('#target');
const challengeLabel = document.querySelector('.challenge-label');
const timerTrack = document.querySelector('.timer-track');
const countdownDisplay = document.querySelector('#countdown');
const timerBar = document.querySelector('#timer-bar');
const scoreDisplay = document.querySelector('#score');
const message = document.querySelector('#message');
const panel = document.querySelector('#calculadora1');
const introOverlay = document.querySelector('#intro-overlay');
const roundsIndicator = document.querySelector('#rounds-indicator');

const t = (key, vars) => window.NSG_I18N.t(key, vars);
const lang = () => window.NSG_I18N.getLang();

let current = '0';
let previous = null;
let operator = null;
let replaceCurrent = false;
let target = 0;
let score = 0;
let operationPoints = 0;
let operationCount = 0;
let roundsPlayed = 0;
let roundsWon = 0;
let roundEnd = 0;
let intermissionEnd = 0;
let mode = 'intro';
let timerInterval = null;
let paused = false;
let pauseStartedAt = 0;

function render() {
  display.textContent = current.replace('.', ',');
}

function formatTarget(value) {
  return String(value);
}

function enterNumber(number) {
  if (current === 'Error') clearCalculator();
  if (replaceCurrent) {
    current = number;
    replaceCurrent = false;
  } else if (current === '0') {
    current = number;
  } else if (current.replace('-', '').length < 12) {
    current += number;
  }
  render();
}

function calculate() {
  if (operator === null || previous === null) return;
  const a = Number(previous);
  const b = Number(current);
  let result;
  if (operator === '+') result = a + b;
  if (operator === '−') result = a - b;
  if (operator === '×') result = a * b;
  if (operator === '÷') result = b === 0 ? NaN : a / b;

  expression.textContent = `${format(a)} ${operator} ${format(b)} =`;
  current = Number.isFinite(result) ? String(Number(result.toPrecision(10))) : 'Error';
  previous = null;
  operator = null;
  replaceCurrent = true;
  render();
  if (mode === 'playing' && current !== 'Error' && Math.abs(Number(current) - target) < 1e-9) win();
}

function format(value) {
  return String(value).replace('.', ',');
}

function chooseOperator(nextOperator) {
  if (mode !== 'playing' || current === 'Error') return;
  if (operator && !replaceCurrent) calculate();
  if (mode !== 'playing') return;
  previous = current;
  operator = nextOperator;
  replaceCurrent = true;
  operationCount += 1;
  operationPoints += ({ '+': 2, '−': 2, '×': 5, '÷': 6 })[nextOperator];
  expression.textContent = `${format(Number(previous))} ${operator}`;
}

function clearCalculator() {
  current = '0'; previous = null; operator = null; replaceCurrent = false;
  expression.textContent = '';
  render();
}

function handleAction(action) {
  if (action === 'clear') clearCalculator();
  if (action === 'decimal' && current !== 'Error') {
    if (replaceCurrent) { current = '0'; replaceCurrent = false; }
    if (!current.includes('.')) current += '.';
  }
  if (action === 'sign' && current !== 'Error') current = String(Number(current) * -1);
  if (action === 'percent' && current !== 'Error') current = String(Number(current) / 100);
  if (action === 'equals') calculate();
  render();
}

function updateRoundsIndicator() {
  roundsIndicator.textContent = t('calc.roundsIndicator', {
    current: Math.min(roundsPlayed + 1, ROUNDS_TOTAL),
    total: ROUNDS_TOTAL,
  });
}

function startRound() {
  target = Math.floor(Math.random() * (MAX_TARGET - MIN_TARGET + 1)) + MIN_TARGET;
  targetDisplay.textContent = formatTarget(target);
  challengeLabel.textContent = t('calc.challengeLabel');
  timerTrack.hidden = false;
  countdownDisplay.hidden = false;
  document.querySelector('.challenge').classList.remove('intermission');
  operationPoints = 0;
  operationCount = 0;
  clearCalculator();
  message.textContent = t('calc.readyMessage');
  message.className = 'game-message';
  mode = 'playing';
  roundEnd = Date.now() + ROUND_DURATION_MS;
  updateRoundsIndicator();
}

function finishRound(won) {
  if (mode !== 'playing') return;
  roundsPlayed += 1;
  if (won) {
    const earned = 10 + operationPoints + Math.max(0, operationCount - 1) * 3;
    score += earned;
    scoreDisplay.textContent = score;
    message.textContent = t('calc.correctMessage', { points: earned });
    message.className = 'game-message success';
  } else {
    message.textContent = t('calc.timeUpMessage');
    message.className = 'game-message failure';
  }
  if (won) roundsWon += 1;

  if (roundsPlayed >= ROUNDS_TOTAL) {
    clearCalculator();
    mode = 'intermission'; // bloquea la entrada mientras se ve el último mensaje
    intermissionEnd = Date.now() + FINAL_ROUND_DELAY_MS;
    if (window.NSG) window.NSG.setProvisionalScore(score);
    return;
  }

  clearCalculator();
  mode = 'intermission';
  challengeLabel.textContent = t('calc.nextRoundLabel');
  targetDisplay.textContent = '5';
  timerTrack.hidden = true;
  countdownDisplay.hidden = true;
  document.querySelector('.challenge').classList.add('intermission');
  intermissionEnd = Date.now() + INTERMISSION_MS;
  if (window.NSG) window.NSG.setProvisionalScore(score);
}

function win() {
  finishRound(true);
}

function updateTimers() {
  if (paused || mode === 'intro' || mode === 'ended') return;
  const now = Date.now();
  if (mode === 'playing') {
    const remaining = Math.max(0, roundEnd - now);
    const seconds = Math.ceil(remaining / 1000);
    countdownDisplay.textContent = seconds;
    timerBar.style.width = `${remaining / 100}%`;
    timerBar.classList.toggle('warning', remaining <= 6000 && remaining > 3000);
    timerBar.classList.toggle('danger', remaining <= 3000);
    if (remaining === 0) finishRound(false);
  } else if (roundsPlayed >= ROUNDS_TOTAL) {
    if (now >= intermissionEnd) endGame();
  } else {
    const remaining = Math.max(0, intermissionEnd - now);
    const seconds = Math.ceil(remaining / 1000);
    targetDisplay.textContent = seconds;
    if (remaining === 0) startRound();
  }
}

function buildEndOverlay() {
  const finalKind = roundsWon >= Math.ceil(ROUNDS_TOTAL / 2) ? 'victory' : 'defeat';
  const finalMessage = window.NSG_MESSAGES.random(lang(), finalKind);
  introOverlay.innerHTML = `
    <h2>${t('calc.partidaOverTitle')}</h2>
    <p class="description" style="margin:0;max-width:none;">${t('calc.partidaOverDetail', { rounds: ROUNDS_TOTAL, score })}</p>
    <p class="flavor-message" id="end-flavor" aria-live="polite"></p>
    <div class="overlay-actions">
      <button class="btn btn-primary" id="replay-btn">${t('common.replay')}</button>
      <button class="btn btn-secondary" id="menu-btn">${t('common.backToMenu')}</button>
    </div>
  `;
  document.querySelector('#end-flavor').textContent = finalMessage;
  document.querySelector('#replay-btn').addEventListener('click', startGame);
  document.querySelector('#menu-btn').addEventListener('click', () => {
    window.location.href = '../../../index.html';
  });
  focusOverlayPrimaryButton();
}

function endGame() {
  if (paused || mode === 'ended') return;
  mode = 'ended';
  clearInterval(timerInterval);
  if (window.NSG) window.NSG.settleProvisionalScore(score);
  panel.classList.add('is-intro');
  introOverlay.style.display = 'flex';
  buildEndOverlay();
  // En la Secuencia millonaria solo cuenta ganar todas las rondas.
  if (window.NSG_SEQUENCE) window.NSG_SEQUENCE.finish({ won: roundsWon === ROUNDS_TOTAL, overlay: introOverlay });
}

function startGame() {
  panel.classList.remove('is-intro');
  introOverlay.style.display = 'none';
  if (window.NSG) window.NSG.markGamePlayed('calculadora');
  score = 0;
  if (window.NSG) window.NSG.setProvisionalScore(0);
  roundsPlayed = 0;
  roundsWon = 0;
  scoreDisplay.textContent = score;
  startRound();
  clearInterval(timerInterval);
  timerInterval = setInterval(updateTimers, 100);
}

document.querySelector('#start-btn').addEventListener('click', startGame);

keys.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button || mode !== 'playing' || paused) return;
  if (button.dataset.number !== undefined) enterNumber(button.dataset.number);
  if (button.dataset.operator) chooseOperator(button.dataset.operator);
  if (button.dataset.action) handleAction(button.dataset.action);
});

document.addEventListener('keydown', (event) => {
  if (mode !== 'playing' || paused) return;
  if (/^[0-9]$/.test(event.key)) enterNumber(event.key);
  else if (event.key === '.' || event.key === ',') handleAction('decimal');
  else if (event.key === '+') chooseOperator('+');
  else if (event.key === '-') chooseOperator('−');
  else if (event.key === '*') chooseOperator('×');
  else if (event.key === '/') { event.preventDefault(); chooseOperator('÷'); }
  else if (event.key === 'Enter' || event.key === '=') handleAction('equals');
  else if (event.key === 'Backspace') handleAction('clear');
  else return;
  event.preventDefault();
});

// El botón principal del overlay (empezar / jugar de nuevo) queda enfocado
// automáticamente para poder pulsarlo con Enter/espacio sin ratón, y las
// flechas ←/→ permiten cambiar al otro botón cuando hay dos.
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

// Pausar/reanudar para el aviso de "salir con ESC": se para el intervalo y,
// al reanudar, se desplazan los relojes el tiempo exacto que ha estado
// parado, para que no se "coma" segundos mientras se decide si salir.
function pauseGame() {
  paused = true;
  pauseStartedAt = Date.now();
  clearInterval(timerInterval);
}

function resumeGame() {
  paused = false;
  const pausedMs = Date.now() - pauseStartedAt;
  roundEnd += pausedMs;
  intermissionEnd += pausedMs;
  timerInterval = setInterval(updateTimers, 100);
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
focusOverlayPrimaryButton();
if (window.NSG_AUDIO && window.NSG_MUSIC) window.NSG_AUDIO.initGameMusic('../../../');
if (window.NSG_QUIT_CONFIRM) {
  window.NSG_QUIT_CONFIRM.init({
    isActive: () => mode === 'playing' || mode === 'intermission',
    getScore: () => score,
    onPause: pauseGame,
    onResume: resumeGame,
    menuHref: '../../../index.html',
  });
}
