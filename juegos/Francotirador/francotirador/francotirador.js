// Las tres versiones comparten este script; cada página declara la suya en <body data-sniper>.
const GAME_ID = document.body.dataset.sniper || 'francotirador';
const core = window.NSG_SNIPER_CORE;
const CONFIG = core.configFor(GAME_ID);
const FRAME_MS = 16;
const MAX_FRAME_MS = 100;
const MARKER_SECONDS = 6;
const TAU = Math.PI * 2;
// Lienzo lógico 960 x 540: 48 px por mil, la diana centrada.
const VIEW_W = 960;
const VIEW_H = 540;
const PX = VIEW_W / CONFIG.view.width;
const CX = VIEW_W / 2;
const CY = VIEW_H / 2;
const ZONE_FILL = ['#d9564d', '#f6f1e4', '#2f3a30', '#f6f1e4'];

const $ = (selector) => document.querySelector(selector);
const canvas = $('#scope');
const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
const compass = $('#compass');
const compassCtx = compass && compass.getContext ? compass.getContext('2d') : null;
const panel = $('#sniper-game');
const stage = $('#stage');
const scene = $('#scene');
const introOverlay = $('#intro-overlay');
const tutorial = $('#tutorial');
const tutorialClose = $('#tutorial-close');
const tutorialBody = $('#tutorial-body');
const scoreDisplay = $('#score');
const message = $('#message');
const roundIndicator = $('#round-indicator');

const t = (key, vars) => window.NSG_I18N.t(key, vars);
const lang = () => window.NSG_I18N.getLang();
const reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const difficultyDebug = window.NSG_DIFFICULTY_DEBUG
  ? window.NSG_DIFFICULTY_DEBUG.create(panel, CONFIG.tiers)
  : { setCurrent() {} };

let mode = 'intro'; // intro | playing | between | ended
let paused = false;
let match = null;
let round = null;
let loop = null;
let lastFrame = 0;
let markerAge = MARKER_SECONDS;
let recoil = 0;
let flash = 0;
let impactAge = 99;
let heartPhase = 0;
let heartTimer = 0;
let tutorialOpen = false;
let tutorialReturnFocus = null;

// ---------------------------------------------------------------------------
// Utilidades de texto
// ---------------------------------------------------------------------------
function fmt(value, digits = 1) {
  const text = value.toFixed(digits);
  return lang() === 'en' || lang() === 'zh-Hans' ? text : text.replace('.', ',');
}

function thousands(value) {
  return Number(value).toLocaleString(lang());
}

const arrow = (value) => (value >= 0 ? '→' : '←');
const marks = (value) => `${fmt(value, 2)} ${t('francotirador.unitMarks')}`;

function setMessage(text, kind = '') {
  message.textContent = text;
  message.className = `game-message ${kind}`.trim();
}

const textCache = new Map();
function setText(el, text) {
  if (!el || textCache.get(el) === text) return;
  textCache.set(el, text);
  el.textContent = text;
}

// ---------------------------------------------------------------------------
// Paisaje: masas low poly desenfocadas alrededor de la diana. Se sortea al empezar
// la ronda y se mantiene en sus 5 disparos. Son manchas, no un paisaje exacto.
// ---------------------------------------------------------------------------
const BIOMES = {
  desert: {
    sky: ['#f1d3a0', '#fbeccf'], haze: '#f0d6a2', sea: null,
    ground: ['#d9a864', '#c9914f', '#e6c488', '#b98046'], near: ['#a9703f', '#8f5a33'], spiky: false,
  },
  forest: {
    sky: ['#bcdad6', '#e9f2ea'], haze: '#d4e5d4', sea: null,
    ground: ['#4d7a55', '#3b6648', '#6a9a63', '#2f5440'], near: ['#2c4a39', '#243d30'], spiky: true,
  },
  beach: {
    sky: ['#b4def0', '#eaf6f7'], haze: '#dff0f0', sea: '#4c9fbd',
    ground: ['#ecd9a8', '#e0c88c', '#f2e4bd'], near: ['#6f8a5c', '#5a7a57'], spiky: false,
  },
};

const rand = Math.random;
const pick = (list) => list[Math.floor(rand() * list.length)];

function ridge(points, spiky) {
  const coords = ['0% 100%'];
  for (let i = 0; i <= points; i += 1) {
    const x = (i / points) * 100;
    const high = spiky ? (i % 2 === 0 ? rand() * 25 : 40 + rand() * 40) : rand() * 60;
    coords.push(`${x.toFixed(1)}% ${high.toFixed(1)}%`);
  }
  coords.push('100% 100%');
  return `polygon(${coords.join(',')})`;
}

function addMass(box, color, blur, spiky, points) {
  const wrap = document.createElement('div');
  wrap.className = 'mass';
  wrap.style.cssText = `left:${box.left}%;top:${box.top}%;width:${box.width}%;height:${box.height}%;filter:blur(${blur}px);`;
  const shape = document.createElement('div');
  shape.style.cssText = `position:absolute;inset:0;background:${color};clip-path:${ridge(points, spiky)};`;
  const shade = document.createElement('div');
  shade.style.cssText = `position:absolute;inset:0;background:#00000024;clip-path:polygon(${(40 + rand() * 20).toFixed(0)}% ${(rand() * 40).toFixed(0)}%,100% ${(30 + rand() * 40).toFixed(0)}%,100% 100%,${(30 + rand() * 30).toFixed(0)}% 100%);`;
  wrap.append(shape, shade);
  scene.append(wrap);
}

function buildScene() {
  if (!scene) return;
  const name = pick(Object.keys(BIOMES));
  const biome = BIOMES[name];
  scene.replaceChildren();
  scene.dataset.biome = name;
  scene.style.setProperty('--sky-top', biome.sky[0]);
  scene.style.setProperty('--sky-bottom', biome.sky[1]);
  scene.style.setProperty('--haze', biome.haze);
  if (biome.sea) addMass({ left: -5, top: 50 + rand() * 4, width: 110, height: 14 }, biome.sea, 3, false, 5);
  // Banda del horizonte (cruza el visor por debajo de la diana).
  addMass({ left: -5, top: 54 + rand() * 6, width: 110, height: 46 }, pick(biome.ground), 4, biome.spiky, 7);
  addMass({ left: -5, top: 66 + rand() * 6, width: 110, height: 40 }, pick(biome.ground), 3, false, 6);
  // Masas a los lados: el centro, donde está la diana, queda despejado.
  [-1, 1].forEach((side) => {
    const count = 3 + Math.floor(rand() * 2);
    for (let i = 0; i < count; i += 1) {
      const width = 16 + rand() * 14;
      const height = biome.spiky ? 22 + rand() * 26 : 14 + rand() * 18;
      const reach = rand() * 18; // cuánto entra hacia el centro (máx. ~30 % desde el borde)
      const left = side < 0 ? -6 + reach : 106 - width - reach;
      const bottom = 70 + rand() * 32;
      const near = i >= count - 1;
      addMass(
        { left, top: bottom - height, width, height },
        near ? pick(biome.near) : pick(biome.ground),
        near ? 7 : 4 + rand() * 3,
        biome.spiky,
        biome.spiky ? 9 : 4 + Math.floor(rand() * 3),
      );
    }
  });
}

// ---------------------------------------------------------------------------
// Dibujo del visor
// ---------------------------------------------------------------------------
const toPx = (x, y) => [CX + x * PX, CY + y * PX];

function drawTarget(centerX) {
  const distance = round.distance;
  for (let i = CONFIG.zones.length - 1; i >= 0; i -= 1) {
    const radius = (CONFIG.zones[i].radius / distance) * 1000 * PX;
    ctx.beginPath();
    ctx.arc(CX + centerX * PX, CY, radius, 0, TAU);
    ctx.fillStyle = ZONE_FILL[i];
    ctx.fill();
    ctx.lineWidth = i === CONFIG.zones.length - 1 ? 1.4 : 0.8;
    ctx.strokeStyle = i === CONFIG.zones.length - 1 ? '#1b231d' : 'rgba(27,35,29,.45)';
    ctx.stroke();
  }
}

// El agujero queda en su diana: si ésta se mueve, se lo lleva consigo.
function drawHole(shot) {
  const [x, y] = toPx(shot.rel.x + round.targetX[shot.target], shot.rel.y);
  if (x < -4 || x > VIEW_W + 4 || y < -4 || y > VIEW_H + 4) return;
  ctx.beginPath();
  ctx.arc(x, y, 2.6, 0, TAU);
  ctx.fillStyle = shot.points > 0 ? '#3fbf5a' : '#e5412d';
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = '#f6f1e4';
  ctx.stroke();
}

function drawOffscreen(shot) {
  const [x, y] = toPx(shot.impact.x, shot.impact.y);
  if (x >= 0 && x <= VIEW_W && y >= 0 && y <= VIEW_H) return;
  const angle = Math.atan2(y - CY, x - CX);
  const px = Math.min(VIEW_W - 16, Math.max(16, x));
  const py = Math.min(VIEW_H - 16, Math.max(16, y));
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(-8, -8);
  ctx.lineTo(-8, 8);
  ctx.closePath();
  ctx.fillStyle = '#f2c35c';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#1b231d';
  ctx.stroke();
  ctx.restore();
}

function drawMarker(shot, age) {
  if (age > MARKER_SECONDS) return;
  const fade = age < MARKER_SECONDS - 1 ? 1 : MARKER_SECONDS - age;
  const [sx, sy] = toPx(shot.sight.x, shot.sight.y);
  const [ix, iy] = toPx(shot.impact.x, shot.impact.y);
  const hit = shot.points > 0;
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.setLineDash([5, 5]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,255,255,.7)';
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ix, iy); ctx.stroke();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = hit ? '#2f7fe8' : '#e5412d';
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ix, iy); ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = hit ? '#f2d21b' : '#e5412d';
  ctx.beginPath(); ctx.moveTo(sx - 4, sy - 4); ctx.lineTo(sx + 4, sy + 4); ctx.moveTo(sx + 4, sy - 4); ctx.lineTo(sx - 4, sy + 4); ctx.stroke();
  if (age < 1.2) {
    const p = age / 1.2;
    ctx.globalAlpha = (1 - p) * fade;
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#f2c35c';
    ctx.beginPath(); ctx.arc(ix, iy, 6 + p * 16, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}

function drawReticle(x, y) {
  const strokeLines = () => {
    ctx.beginPath();
    ctx.moveTo(0, y); ctx.lineTo(x - 9, y); ctx.moveTo(x + 9, y); ctx.lineTo(VIEW_W, y);
    ctx.moveTo(x, 0); ctx.lineTo(x, y - 9); ctx.moveTo(x, y + 9); ctx.lineTo(x, VIEW_H);
    ctx.stroke();
  };
  const strokeTicks = () => {
    ctx.beginPath();
    for (let k = -10; k <= 10; k += 1) {
      if (k === 0) continue;
      const len = k % 5 === 0 ? 8 : 4;
      const tx = x + k * PX;
      ctx.moveTo(tx, y - len); ctx.lineTo(tx, y + len);
      if (Math.abs(k) <= 5) {
        const ty = y + k * PX;
        ctx.moveTo(x - len, ty); ctx.lineTo(x + len, ty);
      }
    }
    ctx.stroke();
  };
  ctx.save();
  ctx.lineWidth = 3.6;
  ctx.strokeStyle = 'rgba(255,255,255,.5)';
  strokeLines(); strokeTicks();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(16,20,15,.88)';
  strokeLines(); strokeTicks();
  ctx.beginPath();
  ctx.arc(x, y, 1.8, 0, TAU);
  ctx.fillStyle = '#d9564d';
  ctx.fill();
  ctx.restore();
}

function render() {
  if (!ctx || !round) return;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  round.targetX.forEach(drawTarget);
  round.shots.forEach((shot) => { if (shot.impact) drawHole(shot); });
  const last = round.shots[round.shots.length - 1];
  if (last && last.impact) {
    drawMarker(last, markerAge);
    if (markerAge <= MARKER_SECONDS) drawOffscreen(last);
  }
  const tremor = round.tremorOffset();
  const [rx, ry] = toPx(round.aim.x + tremor.x, round.aim.y + tremor.y - recoil);
  drawReticle(rx, ry);
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,248,220,${Math.min(0.35, flash)})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}

function drawCompass() {
  if (!compassCtx || !round) return;
  const c = compassCtx;
  const mid = 48;
  const R = 38;
  c.clearRect(0, 0, 96, 96);
  c.lineWidth = 1.5;
  c.strokeStyle = '#9db59f';
  c.beginPath(); c.arc(mid, mid, R, 0, TAU); c.stroke();
  c.beginPath();
  for (let h = 0; h < 12; h += 1) {
    const a = (h * 30 * Math.PI) / 180;
    const inner = h % 3 === 0 ? R - 6 : R - 3;
    c.moveTo(mid + Math.sin(a) * inner, mid - Math.cos(a) * inner);
    c.lineTo(mid + Math.sin(a) * R, mid - Math.cos(a) * R);
  }
  c.stroke();
  // Arriba, el blanco; abajo, el tirador.
  c.fillStyle = '#d9564d';
  c.beginPath(); c.arc(mid, mid - R + 11, 3.5, 0, TAU); c.fill();
  c.fillStyle = '#eef3ec';
  c.beginPath(); c.moveTo(mid, mid + R - 14); c.lineTo(mid - 4, mid + R - 6); c.lineTo(mid + 4, mid + R - 6); c.closePath(); c.fill();
  // Flecha: sale del lado de donde procede el viento y apunta al centro.
  const a = (round.wind.from * Math.PI) / 180;
  const share = round.wind.speed / round.tier.windMax;
  const tail = R - 2;
  const head = Math.max(6, tail - (10 + 22 * share));
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  c.strokeStyle = '#f2c35c';
  c.fillStyle = '#f2c35c';
  c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(mid + dx * tail, mid + dy * tail); c.lineTo(mid + dx * head, mid + dy * head); c.stroke();
  const hx = mid + dx * head;
  const hy = mid + dy * head;
  c.beginPath();
  c.moveTo(hx, hy);
  c.lineTo(hx + dx * 8 - dy * 5, hy + dy * 8 + dx * 5);
  c.lineTo(hx + dx * 8 + dy * 5, hy + dy * 8 - dx * 5);
  c.closePath(); c.fill();
}

// ---------------------------------------------------------------------------
// Interfaz (recuadro de datos, reloj, barras)
// ---------------------------------------------------------------------------
const el = {
  wind: $('#hud-wind'), from: $('#hud-from'), distance: $('#hud-distance'), place: $('#hud-place'),
  flightTime: $('#hud-flight'), drift: $('#hud-drift'), coriolis: $('#hud-coriolis'), conc: $('#hud-conc'),
  pulse: $('#hud-pulse'), heart: $('#heart'), air: $('#air-bar'), clock: $('#clock'),
  shotCounter: $('#shot-counter'), roundScore: $('#round-score'), detail: $('#last-detail'),
  concTrack: $('#conc-track'), concMarker: $('#conc-marker'), concValue: $('#conc-value'),
  flight: $('#flight'), flightBar: $('#flight-bar'), goal: $('#goal'),
};

function placeText() {
  const lat = Math.abs(round.place.latitude);
  const side = t(round.place.latitude >= 0 ? 'francotirador.latNorth' : 'francotirador.latSouth', { deg: fmt(lat, 1) });
  return `${t(`francotirador.place.${round.place.id}`)} · ${side}`;
}

function updateStaticHud() {
  setText(el.distance, `${round.distance} m`);
  setText(el.place, placeText());
  setText(el.flightTime, `${fmt(round.flightTime, 2)} s`);
  setText(el.drift, t('francotirador.driftValue', { value: fmt(round.windPerMs, 2) }));
  setText(el.coriolis, `${arrow(round.corMil)} ${marks(Math.abs(round.corMil))}`);
  setText(roundIndicator, t('francotirador.roundIndicator', { round: match.roundIndex + 1, rounds: CONFIG.rounds }));
}

function liveTotal() {
  if (!match) return 0;
  return mode === 'between' || mode === 'ended' || !round ? match.total : match.total + round.score();
}

function updateHud(dt) {
  if (!round) return;
  const w = round.wind;
  setText(el.wind, `${fmt(w.speed, 1)} m/s`);
  const hour = Math.round(w.from / 30) % 12 || 12;
  setText(el.from, `${hour} h · ${Math.round(w.from) % 360}°`);
  const c = round.bar();
  setText(el.conc, `${c >= 0 ? '+' : '−'}${fmt(Math.abs(c), 2)}`);
  setText(el.concValue, `${c >= 0 ? '+' : '−'}${fmt(Math.abs(c), 2)}`);
  el.concMarker.style.left = `${((c + 1) / 2) * 100}%`;
  el.concTrack.classList.toggle('is-frozen', round.phase !== 'aiming');
  setText(el.pulse, `${Math.round(round.bpm)} bpm`);
  heartPhase += (round.bpm / 60) * dt;
  if (heartPhase >= 1) { heartPhase -= 1; heartTimer = 0.28; el.heart.classList.add('is-beat'); }
  if (heartTimer > 0) { heartTimer -= dt; if (heartTimer <= 0) el.heart.classList.remove('is-beat'); }
  el.air.style.width = `${(round.air / CONFIG.breath.max) * 100}%`;
  el.air.classList.toggle('is-exhausted', round.exhausted);
  const low = round.phase === 'aiming' && round.timeLeft <= 5;
  setText(el.clock, round.phase === 'aiming' && round.timeLeft <= 5 ? round.timeLeft.toFixed(1) : String(Math.ceil(round.timeLeft)));
  el.clock.classList.toggle('is-low', low);
  el.clock.classList.toggle('is-blink', low && !reducedMotion);
  el.clock.classList.toggle('is-flying', round.phase !== 'aiming');
  const flying = round.phase === 'flight' && round.bullet;
  el.flight.classList.toggle('is-on', !!flying);
  if (flying) el.flightBar.style.width = `${Math.min(100, (round.bullet.t / round.flightTime) * 100)}%`;
  const n = round.phase === 'aiming' ? round.shots.length + 1 : round.shots.length;
  setText(el.shotCounter, t('francotirador.shotCounter', { n: Math.max(1, n), total: CONFIG.shotsPerRound }));
  setText(el.roundScore, String(round.score()));
  setText(scoreDisplay, String(liveTotal()));
  stage.classList.toggle('is-aiming', mode === 'playing');
  drawCompass();
}

function showLastShot(shot) {
  const tremor = Math.hypot(shot.tremor.x, shot.tremor.y);
  const conc = Math.hypot(shot.conc.x, shot.conc.y);
  const rows = [
    ['is-points', 'francotirador.detailPoints', String(shot.points)],
    ['', 'francotirador.detailDistance', `${fmt(shot.radiusMetres, 2)} m`],
    ['', 'francotirador.detailConc', marks(conc)],
    ['', 'francotirador.detailWind', `${arrow(shot.wind)} ${marks(Math.abs(shot.wind))}`],
    ['', 'francotirador.detailCoriolis', `${arrow(round.corMil)} ${marks(Math.abs(round.corMil))}`],
    ['', 'francotirador.detailTremor', marks(tremor)],
  ];
  el.detail.replaceChildren();
  rows.forEach(([cls, key, value]) => {
    const row = document.createElement('div');
    if (cls) row.className = cls;
    const dt = document.createElement('dt');
    dt.textContent = t(key);
    const dd = document.createElement('dd');
    dd.textContent = value;
    row.append(dt, dd);
    el.detail.append(row);
  });
  el.detail.hidden = false;
}

// ---------------------------------------------------------------------------
// Rondas y partida
// ---------------------------------------------------------------------------
function beginRound() {
  round = match.startRound();
  buildScene();
  difficultyDebug.setCurrent(round.tier);
  markerAge = MARKER_SECONDS;
  impactAge = 99;
  recoil = 0;
  flash = 0;
  el.detail.hidden = true;
  el.detail.replaceChildren();
  updateStaticHud();
  setMessage(t('francotirador.readyMessage'));
  mode = 'playing';
  paused = false;
  releaseInput();
  render();
  updateHud(0);
  lastFrame = Date.now();
  clearInterval(loop);
  loop = setInterval(frame, FRAME_MS);
}

function startGame() {
  panel.classList.remove('is-intro');
  introOverlay.style.display = 'none';
  if (window.NSG) window.NSG.markGamePlayed(GAME_ID);
  match = core.createMatch({ cfg: CONFIG });
  setText(scoreDisplay, '0');
  beginRound();
  canvas.focus({ preventScroll: true });
}

function onShot(shot, auto) {
  recoil = reducedMotion ? 0 : 1.1;
  flash = reducedMotion ? 0 : 0.3;
  if (!reducedMotion) {
    stage.classList.remove('is-kick');
    void stage.offsetWidth;
    stage.classList.add('is-kick');
  }
  setMessage(auto ? t('francotirador.msgAuto') : t('francotirador.msgFlight'));
  return shot;
}

function onImpact(shot) {
  markerAge = 0;
  impactAge = 0;
  showLastShot(shot);
  setMessage(
    shot.points > 0 ? t('francotirador.msgImpact', { points: shot.points }) : t('francotirador.msgMiss'),
    shot.points > 0 ? 'success' : 'failure',
  );
}

function frame() {
  if (mode !== 'playing' || paused) return;
  const now = Date.now();
  const dt = Math.min(Math.max(now - lastFrame, 0), MAX_FRAME_MS) / 1000;
  lastFrame = now;
  applyKeyboardAim(dt);
  recoil = Math.max(0, recoil - recoil * Math.min(1, dt * 7) - dt * 0.05);
  flash = Math.max(0, flash - dt * 2.5);
  markerAge += dt;
  const wasExhausted = round.exhausted;
  const events = round.advance(dt);
  if (!wasExhausted && round.exhausted) setMessage(t('francotirador.msgExhausted'), 'failure');
  let ended = false;
  events.forEach((event) => {
    if (event.type === 'shot') onShot(event.shot, true);
    else if (event.type === 'impact') onImpact(event.shot);
    else if (event.type === 'turn') setMessage(t('francotirador.readyMessage'));
    else if (event.type === 'end') ended = true;
  });
  render();
  updateHud(dt);
  if (ended) roundEnd();
}

function focusOverlayPrimaryButton() {
  const btn = introOverlay.querySelector('.btn-primary') || introOverlay.querySelector('.btn');
  if (btn) btn.focus();
}

function showOverlay(html) {
  introOverlay.innerHTML = html;
  panel.classList.add('is-intro');
  introOverlay.style.display = 'flex';
}

function roundEnd() {
  clearInterval(loop);
  releaseInput();
  const score = match.finishRound();
  setText(scoreDisplay, String(match.total));
  if (match.isOver()) { endGame(); return; }
  mode = 'between';
  const shots = round.shots.map((shot) => shot.points).join(' · ');
  showOverlay(`
    <h2>${t('francotirador.roundDoneTitle', { round: match.roundIndex })}</h2>
    <p class="sniper-verdict">${t('francotirador.roundDoneScore', { score, max: core.maxRoundScore(CONFIG) })}</p>
    <p class="description" style="margin:0;max-width:none;">${shots}</p>
    <p class="description" style="margin:0;max-width:none;">${t('francotirador.progressLine', { total: match.total, goal: CONFIG.passScore, left: CONFIG.rounds - match.roundIndex })}</p>
    <div class="overlay-actions">
      <button class="btn btn-primary" id="next-btn">${t('francotirador.nextRound')}</button>
    </div>
  `);
  introOverlay.querySelector('#next-btn').addEventListener('click', () => {
    panel.classList.remove('is-intro');
    introOverlay.style.display = 'none';
    beginRound();
    canvas.focus({ preventScroll: true });
  });
  focusOverlayPrimaryButton();
}

function endGame() {
  if (mode === 'ended') return;
  mode = 'ended';
  clearInterval(loop);
  const won = match.passed();
  if (won && window.NSG) window.NSG.addPendingScore(CONFIG.rewardPoints);
  const line = window.NSG_MESSAGES.random(lang(), won ? 'victory' : 'defeat');
  setMessage(won ? t('francotirador.winTitle') : t('francotirador.loseTitle'), won ? 'success' : 'failure');
  showOverlay(`
    <h2>${won ? t('francotirador.winTitle') : t('francotirador.loseTitle')}</h2>
    <p class="description" style="margin:0;max-width:none;"><strong>${t('francotirador.finalScore', { total: match.total, goal: CONFIG.passScore })}</strong></p>
    ${won ? `<p class="sniper-verdict is-win">${t('francotirador.winReward', { points: thousands(CONFIG.rewardPoints) })}</p>` : ''}
    <p class="description" style="margin:0;max-width:none;">${line}</p>
    <div class="overlay-actions">
      <button class="btn btn-primary" id="replay-btn">${t('common.replay')}</button>
      <button class="btn btn-secondary" id="menu-btn">${t('common.backToMenu')}</button>
    </div>
  `);
  introOverlay.querySelector('#replay-btn').addEventListener('click', startGame);
  introOverlay.querySelector('#menu-btn').addEventListener('click', () => {
    window.location.href = '../../../index.html';
  });
  focusOverlayPrimaryButton();
  if (window.NSG_SEQUENCE) window.NSG_SEQUENCE.finish({ won, overlay: introOverlay });
}

// ---------------------------------------------------------------------------
// Entrada: ratón y teclado se traducen a las mismas acciones (mover, contener, disparar).
// ---------------------------------------------------------------------------
const heldDirections = { left: 0, right: 0, up: 0, down: 0 }; // instante de pulsación (ms), 0 = suelta
let breathKeys = 0;
let breathButton = false;

const canAct = () => mode === 'playing' && !paused && !!round;

const ACTIONS = {
  fire() {
    const shot = round.fire();
    if (shot) onShot(shot, false);
  },
  breath(on) { round.setHolding(on); },
  aimTo(x, y) { round.setAim(x, y); },
};

function releaseInput() {
  Object.keys(heldDirections).forEach((name) => { heldDirections[name] = 0; });
  breathKeys = 0;
  breathButton = false;
  if (round) round.setHolding(false);
}

function applyKeyboardAim(dt) {
  const now = Date.now();
  const speed = (name) => core.aimSpeed((now - heldDirections[name]) / 1000);
  let dx = 0;
  let dy = 0;
  if (heldDirections.left) dx -= speed('left') * dt;
  if (heldDirections.right) dx += speed('right') * dt;
  if (heldDirections.up) dy -= speed('up') * dt;
  if (heldDirections.down) dy += speed('down') * dt;
  if (dx || dy) round.moveAim(dx, dy);
}

const KEY_DIRECTION = {
  ArrowLeft: 'left', KeyA: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', KeyD: 'right', d: 'right', D: 'right',
  ArrowUp: 'up', KeyW: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', KeyS: 'down', s: 'down', S: 'down',
};
const isBreathKey = (event) => event.key === 'Shift' || event.code === 'KeyC' || event.key === 'c' || event.key === 'C';
const isFireKey = (event) => event.key === ' ' || event.code === 'Space';

// Escape cierra la guía antes de que el aviso de salida lo interprete (se registra primero).
document.addEventListener('keydown', (event) => {
  if (!tutorialOpen) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!event.repeat) closeTutorial();
  }
}, true);

document.addEventListener('keydown', (event) => {
  if (tutorialOpen || !canAct()) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const direction = KEY_DIRECTION[event.code] || KEY_DIRECTION[event.key];
  if (direction) {
    event.preventDefault();
    if (!heldDirections[direction]) heldDirections[direction] = Date.now();
    return;
  }
  if (isBreathKey(event)) {
    event.preventDefault();
    breathKeys = 1;
    ACTIONS.breath(true);
    return;
  }
  if (isFireKey(event)) {
    event.preventDefault();
    if (!event.repeat) ACTIONS.fire();
  }
});

document.addEventListener('keyup', (event) => {
  const direction = KEY_DIRECTION[event.code] || KEY_DIRECTION[event.key];
  if (direction) heldDirections[direction] = 0;
  if (isBreathKey(event)) {
    breathKeys = 0;
    if (round && !breathButton) round.setHolding(false);
  }
});

window.addEventListener('blur', releaseInput);

function pointerToAim(event) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return [
    ((event.clientX - rect.left) / rect.width - 0.5) * CONFIG.view.width,
    ((event.clientY - rect.top) / rect.height - 0.5) * CONFIG.view.height,
  ];
}

if (canvas) {
  canvas.addEventListener('pointermove', (event) => {
    if (!canAct()) return;
    const aim = pointerToAim(event);
    if (aim) ACTIONS.aimTo(aim[0], aim[1]);
  });
  canvas.addEventListener('pointerdown', (event) => {
    if (!canAct()) return;
    const aim = pointerToAim(event);
    if (aim) ACTIONS.aimTo(aim[0], aim[1]);
    if (event.button === 0) {
      event.preventDefault();
      ACTIONS.fire();
    } else if (event.button === 2) {
      event.preventDefault();
      breathButton = true;
      ACTIONS.breath(true);
      if (canvas.setPointerCapture && event.pointerId !== undefined) canvas.setPointerCapture(event.pointerId);
    }
  });
  const releaseButton = (event) => {
    if (event.button !== undefined && event.button !== 2) return;
    breathButton = false;
    if (round && !breathKeys) round.setHolding(false);
  };
  canvas.addEventListener('pointerup', releaseButton);
  canvas.addEventListener('pointercancel', releaseButton);
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
}

// ---------------------------------------------------------------------------
// Guía de tiro (card grande con X) y antesala
// ---------------------------------------------------------------------------
function setBackgroundInert(value) {
  Array.from(document.body.children).forEach((child) => {
    if (child !== tutorial) child.inert = value;
  });
}

function openTutorial() {
  if (tutorialOpen) return;
  tutorialOpen = true;
  tutorialReturnFocus = document.activeElement;
  setBackgroundInert(true);
  tutorial.style.display = 'flex';
  tutorialBody.scrollTop = 0;
  tutorialClose.focus();
}

function closeTutorial() {
  if (!tutorialOpen) return;
  tutorialOpen = false;
  tutorial.style.display = 'none';
  setBackgroundInert(false);
  // Tras cerrar aparece la antesala de siempre, con «Empezar» preseleccionado.
  focusOverlayPrimaryButton();
}

tutorialClose.addEventListener('click', closeTutorial);
tutorial.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab') return;
  const stops = [tutorialClose, tutorialBody];
  const index = stops.indexOf(document.activeElement);
  event.preventDefault();
  const delta = event.shiftKey ? -1 : 1;
  stops[(index + delta + stops.length) % stops.length].focus();
});

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

$('#start-btn').addEventListener('click', startGame);
$('#guide-btn').addEventListener('click', openTutorial);

// ---------------------------------------------------------------------------
// Pausa: se detienen reloj, viento, bala, respiración y entradas.
// ---------------------------------------------------------------------------
function pauseGame() {
  paused = true;
  clearInterval(loop);
  releaseInput();
}

function resumeGame() {
  paused = false;
  if (mode !== 'playing') return;
  lastFrame = Date.now();
  loop = setInterval(frame, FRAME_MS);
}

window.NSG_GAME_CONTROL = {
  isActive: () => mode === 'playing' || mode === 'between',
  pause: () => {
    if (mode === 'intro' || mode === 'ended' || paused) return false;
    pauseGame();
    return true;
  },
  resume: resumeGame,
};

window.NSG_I18N.applyStaticTranslations(document);
// Textos que cambian de una versión a otra (tiempo por disparo y recompensa): `data-vars` marca el elemento.
const TEXT_VARS = {
  seconds: CONFIG.shotSeconds,
  shots: CONFIG.shotsPerRound,
  totalShots: CONFIG.shotsPerRound * CONFIG.rounds,
  max: core.maxMatchScore(CONFIG),
  goal: CONFIG.passScore,
  points: thousands(CONFIG.rewardPoints),
};
document.querySelectorAll('[data-vars]').forEach((node) => {
  if (node.dataset.i18nHtml) node.innerHTML = t(node.dataset.i18nHtml, TEXT_VARS);
  else node.textContent = t(node.dataset.i18n, TEXT_VARS);
});
setText(el.goal, thousands(CONFIG.passScore));
if (window.NSG_AUDIO && window.NSG_MUSIC) window.NSG_AUDIO.initGameMusic('../../../');
if (window.NSG_QUIT_CONFIRM) {
  window.NSG_QUIT_CONFIRM.init({
    isActive: () => mode === 'playing' || mode === 'between',
    getScore: () => liveTotal(),
    onPause: pauseGame,
    onResume: resumeGame,
    menuHref: '../../../index.html',
  });
}
// La guía se abre al entrar; al cerrarla queda la antesala con la card del juego.
openTutorial();
