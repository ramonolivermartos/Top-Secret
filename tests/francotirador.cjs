// Run with: node --test tests/francotirador.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const core = require('../juegos/Francotirador/francotirador/francotirador-core.js');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const GAME_DIR = 'juegos/Francotirador/francotirador';
const { CONFIG } = core;

function seeded(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const steady = (tier, random, place) => core.createRound({ tier, random, place });
const calmTier = { ...CONFIG.tiers[0], gust: 0 };

// ---------------------------------------------------------------------------
// Fórmulas
// ---------------------------------------------------------------------------
test('ballistics reproduce the reference values at 800 m and 2500 m', () => {
  assert.ok(Math.abs(core.flightTime(800) - 1.12) < 0.01);
  assert.ok(Math.abs(core.windPerMs(800) - 0.14) < 0.01);
  assert.ok(Math.abs(core.flightTime(2500) - 4.9) < 0.01);
  assert.ok(Math.abs(core.windPerMs(2500) - 0.71) < 0.01);
});

test('Coriolis is positive in the north, negative in the south and vanishes at the equator', () => {
  assert.ok(core.coriolis(60, 2000) > 0);
  assert.ok(core.coriolis(-34, 2000) < 0);
  assert.ok(Math.abs(core.coriolis(-0.18, 2500)) < 0.01);
  assert.ok(core.coriolis(60, 2500) > core.coriolis(60, 1000));
});

test('the keyboard aim speed ramps from 0.25 to 2.45 mil/s over 0.7 s', () => {
  assert.equal(core.aimSpeed(0), 0.25);
  assert.equal(core.aimSpeed(0.7), 2.45);
  assert.equal(core.aimSpeed(5), 2.45);
  assert.ok(core.aimSpeed(0.35) > 0.25 && core.aimSpeed(0.35) < 2.45);
});

// ---------------------------------------------------------------------------
// Diana y puntuación
// ---------------------------------------------------------------------------
test('the target is a bullseye plus three rings worth 100, 50, 25 and 10', () => {
  assert.deepEqual(CONFIG.zones.map((zone) => zone.points), [100, 50, 25, 10]);
  assert.equal(CONFIG.zones.length, 4);
  assert.equal(CONFIG.zones[CONFIG.zones.length - 1].radius, CONFIG.targetRadius);
  assert.equal(core.zoneAt(0).points, 100);
  assert.equal(core.zoneAt(0.3).points, 100);
  assert.equal(core.zoneAt(0.31).points, 50);
  assert.equal(core.zoneAt(1.0).points, 25);
  assert.equal(core.zoneAt(2).points, 10);
  assert.equal(core.zoneAt(2.01).points, 0);
  assert.equal(core.zoneAt(2.01).zone, 'miss');
});

test('5 rounds of 5 shots: maximum 2500, 1500 to win 25000', () => {
  assert.equal(CONFIG.rounds, 5);
  assert.equal(CONFIG.shotsPerRound, 5);
  assert.equal(core.maxRoundScore(), 500);
  assert.equal(core.maxMatchScore(), 2500);
  assert.equal(CONFIG.passScore, 1500);
  assert.equal(CONFIG.rewardPoints, 25000);
  assert.equal(core.passed(1499), false);
  assert.equal(core.passed(1500), true);
});

// ---------------------------------------------------------------------------
// Niveles y partida
// ---------------------------------------------------------------------------
test('three levels with no weights and the distance ranges of the design', () => {
  assert.deepEqual(CONFIG.tiers.map((tier) => tier.id), ['easy', 'medium', 'hard']);
  assert.deepEqual(CONFIG.tiers.map((tier) => [tier.minDistance, tier.maxDistance]), [[800, 1200], [1200, 1800], [1800, 2500]]);
  assert.deepEqual(CONFIG.tiers.map((tier) => tier.windMax), [6, 9, 12]);
  assert.ok(CONFIG.tiers.every((tier) => tier.weight === undefined && tier.label));
});

test('each round draws any level with the same probability', () => {
  const random = seeded(11);
  const counts = { easy: 0, medium: 0, hard: 0 };
  for (let i = 0; i < 3000; i += 1) counts[core.pickTier(random).id] += 1;
  Object.values(counts).forEach((count) => assert.ok(Math.abs(count - 1000) < 90, JSON.stringify(counts)));
});

test('a round fixes a distance in range, rounded to 10 m, and a place for Coriolis', () => {
  const random = seeded(5);
  for (const tier of CONFIG.tiers) {
    for (let i = 0; i < 100; i += 1) {
      const round = steady(tier, random);
      assert.equal(round.distance % 10, 0);
      assert.ok(round.distance >= tier.minDistance && round.distance <= tier.maxDistance);
      assert.ok(CONFIG.places.includes(round.place));
    }
  }
  assert.ok(CONFIG.places.some((place) => place.id === 'quito'));
  assert.ok(CONFIG.places.some((place) => place.id === 'singapore'));
});

// ---------------------------------------------------------------------------
// Reglas de ronda
// ---------------------------------------------------------------------------
test('the 20 s clock fires the rifle by itself and a round has exactly 5 shots', () => {
  const round = steady(calmTier, seeded(3));
  const types = [];
  let guard = 0;
  while (round.phase !== 'done' && guard < 200000) {
    round.advance(0.05).forEach((event) => types.push(event.type + (event.auto ? ':auto' : '')));
    guard += 1;
  }
  assert.equal(round.shots.length, 5);
  assert.equal(types.filter((type) => type === 'shot:auto').length, 5);
  assert.equal(types.filter((type) => type === 'impact').length, 5);
  assert.equal(types[types.length - 1], 'end');
  assert.ok(round.shots.every((shot) => shot.timeLeft === 0));
});

test('the clock only runs while aiming: flight time does not count', () => {
  const round = steady(calmTier, seeded(8));
  round.advance(6);
  const before = round.timeLeft;
  assert.ok(Math.abs(before - 14) < 0.1);
  assert.ok(round.fire());
  assert.equal(round.phase, 'flight');
  round.advance(0.5);
  assert.equal(round.timeLeft, before);
  assert.equal(round.fire(), null); // no se dispara con una bala en vuelo
  while (round.phase === 'flight') round.advance(1 / 30);
  assert.equal(round.phase, 'impact');
  assert.equal(round.fire(), null); // ni mientras aparece el agujero
  round.advance(CONFIG.holeDelay + 0.05);
  assert.equal(round.phase, 'aiming');
  assert.ok(round.timeLeft > CONFIG.shotSeconds - 0.1 && round.timeLeft <= CONFIG.shotSeconds);
});

test('the scope can move and breath can be held while the bullet flies', () => {
  const round = steady(calmTier, seeded(8));
  round.fire();
  round.moveAim(1, 0);
  round.setHolding(true);
  round.advance(0.1);
  assert.equal(round.aim.x, 1);
  assert.equal(round.holding, true);
});

test('the aim cannot leave the visor', () => {
  const round = steady(calmTier, seeded(8));
  round.moveAim(99, -99);
  assert.equal(round.aim.x, CONFIG.view.width / 2);
  assert.equal(round.aim.y, -CONFIG.view.height / 2);
});

// ---------------------------------------------------------------------------
// Cada variable cambia el impacto
// ---------------------------------------------------------------------------
function landing(round, setup) {
  if (setup) setup(round);
  round.fire();
  while (round.phase === 'flight') round.advance(1 / 60);
  return round.shots[0];
}

test('wind from the right pushes the impact left and wind from the left pushes it right', () => {
  const fromRight = steady(calmTier, seeded(1));
  fromRight.wind.from = 90; fromRight.wind.speed = 5; fromRight.wind.base = 90;
  const fromLeft = steady(calmTier, seeded(1));
  fromLeft.wind.from = 270; fromLeft.wind.speed = 5; fromLeft.wind.base = 270;
  assert.ok(landing(fromRight).wind < -0.1);
  assert.ok(landing(fromLeft).wind > 0.1);
});

test('only the crosswind pushes: head wind and tail wind do not', () => {
  const head = steady(calmTier, seeded(1));
  head.wind.from = 0; head.wind.speed = 6; head.wind.base = 0;
  assert.ok(Math.abs(landing(head).wind) < 0.01);
  const rightFull = steady(calmTier, seeded(1));
  rightFull.wind.from = 90; rightFull.wind.speed = 6; rightFull.wind.base = 90;
  const diagonal = steady(calmTier, seeded(1));
  diagonal.wind.from = 30; diagonal.wind.speed = 6; diagonal.wind.base = 30; // sen 30° = 0,5
  assert.ok(Math.abs(landing(diagonal).wind / landing(rightFull).wind - 0.5) < 0.02);
});

test('with calm and a still scope the drift matches crosswind x drift per m/s', () => {
  const round = steady(calmTier, seeded(1));
  round.wind.from = 90; round.wind.speed = 5; round.wind.base = 90;
  const shot = landing(round);
  assert.ok(Math.abs(shot.wind + 5 * round.windPerMs) < 0.02, `${shot.wind} vs ${-5 * round.windPerMs}`);
});

test('Coriolis shifts the impact by its announced value', () => {
  const place = { id: 'oslo', latitude: 60 };
  const round = steady(calmTier, seeded(2), place);
  round.wind.speed = 0;
  const shot = landing(round, (r) => { r.wind.mean = 0; });
  assert.ok(Math.abs(shot.impact.x - (shot.aim.x + shot.tremor.x + shot.conc.x + shot.dispersion.x + shot.wind + round.corMil)) < 1e-9);
  assert.ok(round.corMil > 0);
});

test('a centered bar adds almost no error and a bar at the edge adds up to 1 mil', () => {
  const errors = (barTime) => {
    const out = [];
    for (let i = 0; i < 200; i += 1) {
      const round = steady(calmTier, seeded(i + 1));
      round.barTime = barTime;
      round.fire();
      out.push(Math.hypot(round.shots[0].conc.x, round.shots[0].conc.y));
    }
    return out;
  };
  const center = errors(0.9); // sin(pi) = 0
  const edge = errors(0.45); // sin(pi/2) = 1
  assert.ok(Math.max(...center) < 0.001);
  assert.ok(Math.max(...edge) <= 1 && Math.min(...edge) >= 0.55);
});

test('holding breath cuts the tremor, running out of air makes it worse', () => {
  const sample = (setup) => {
    const round = steady(CONFIG.tiers[2], seeded(4));
    setup(round);
    round.advance(0.6); // la amplitud se suaviza: se mide ya estabilizada
    let sum = 0;
    for (let i = 0; i < 90; i += 1) {
      round.advance(1 / 60);
      const { x, y } = round.tremorOffset();
      sum += Math.hypot(x, y);
    }
    return sum / 90;
  };
  const free = sample(() => {});
  const held = sample((round) => round.setHolding(true));
  const exhausted = sample((round) => { round.exhausted = true; round.air = 0; });
  assert.ok(held < free * 0.4, `${held} vs ${free}`);
  assert.ok(exhausted > free, `${exhausted} vs ${free}`);
});

test('breath: 3 s of air, exhausted until 1.2 s recovered at 0.6 s per second', () => {
  const round = steady(calmTier, seeded(6));
  round.setHolding(true);
  round.advance(3.2);
  assert.equal(round.exhausted, true);
  assert.equal(round.holding, false);
  round.advance(1.0); // 0.6 de aire: aún agotada
  assert.equal(round.exhausted, true);
  round.advance(1.1); // supera 1,2
  assert.equal(round.exhausted, false);
  round.setHolding(true);
  round.advance(0.1);
  assert.equal(round.holding, true);
});

test('the pulse rises as the clock runs out and relaxes after the impact', () => {
  const round = steady(calmTier, seeded(9));
  round.advance(1);
  const early = round.bpm;
  round.advance(17);
  const late = round.bpm;
  assert.ok(late > early + 20, `${early} -> ${late}`);
  assert.ok(late > 100 && late < 135);
  round.fire();
  while (round.phase !== 'aiming') round.advance(1 / 30);
  round.advance(6);
  assert.ok(round.bpm < late - 15);
});

test('a farther target trembles more', () => {
  const near = steady({ ...CONFIG.tiers[0], minDistance: 800, maxDistance: 800 }, seeded(2));
  const far = steady({ ...CONFIG.tiers[2], minDistance: 2500, maxDistance: 2500 }, seeded(2));
  const amplitude = (round) => {
    let peak = 0;
    for (let i = 0; i < 1200; i += 1) {
      round.advance(1 / 60);
      const { x, y } = round.tremorOffset();
      peak = Math.max(peak, Math.hypot(x, y));
    }
    return peak;
  };
  assert.ok(amplitude(far) > amplitude(near) * 1.3);
});

test('the wind is a bounded random walk that really changes', () => {
  const tier = CONFIG.tiers[2];
  const round = steady(tier, seeded(21));
  const speeds = [];
  for (let i = 0; i < 400; i += 1) {
    round.advance(0.5);
    speeds.push(round.wind.speed);
    assert.ok(round.wind.speed >= 0 && round.wind.speed <= tier.windMax);
  }
  assert.ok(Math.max(...speeds) - Math.min(...speeds) > 2);
});

// ---------------------------------------------------------------------------
// Partida
// ---------------------------------------------------------------------------
test('a match is 5 rounds, keeps its history and passes at 1500', () => {
  const match = core.createMatch({ random: seeded(31) });
  let guard = 0;
  while (!match.isOver() && guard < 10) {
    const round = match.startRound();
    // Un disparo perfecto cada vez: el centro exacto.
    while (round.phase !== 'done') {
      if (round.phase === 'aiming') {
        round.setAim(-(round.crossRight() * round.windPerMs + round.corMil), 0);
        round.setHolding(true);
        if (Math.abs(round.bar()) < 0.02) round.fire();
      } else round.setHolding(false);
      round.advance(1 / 60);
    }
    match.finishRound();
    guard += 1;
  }
  assert.equal(match.roundIndex, 5);
  assert.equal(match.history.length, 5);
  assert.equal(match.total, match.history.reduce((sum, entry) => sum + entry.score, 0));
  assert.equal(match.passed(), match.total >= 1500);
});

// ---------------------------------------------------------------------------
// Calibración de la dificultad con jugadores simulados
// ---------------------------------------------------------------------------
function randn(random) {
  return Math.sqrt(-2 * Math.log(Math.max(random(), 1e-12))) * Math.cos(2 * Math.PI * random());
}

const MODELS = {
  expert: { readRel: 0.05, readAbs: 0.15, place: 0.03, holdLead: 2.2, fireAt: 9, barThr: 0.08, lull: 0.22, lullUntil: 12 },
  good: { readRel: 0.1, readAbs: 0.3, place: 0.05, holdLead: 1.8, fireAt: 8, barThr: 0.12, lull: 99, lullUntil: 0 },
  average: { readRel: 0.2, readAbs: 0.6, place: 0.1, holdLead: 0, fireAt: 6, barThr: 0.3, lull: 99, lullUntil: 0 },
  noBreath: { readRel: 0.1, readAbs: 0.3, place: 0.05, holdLead: 0, fireAt: 8, barThr: 0.12, lull: 99, lullUntil: 0 },
  noBar: { readRel: 0.1, readAbs: 0.3, place: 0.05, holdLead: 1.8, fireAt: 8, barThr: 1.01, lull: 99, lullUntil: 0 },
  noCoriolis: { readRel: 0.1, readAbs: 0.3, place: 0.05, holdLead: 1.8, fireAt: 8, barThr: 0.12, lull: 99, lullUntil: 0, ignoreCor: true },
  rushed: { readRel: 0.1, readAbs: 0.3, place: 0.05, holdLead: 0, fireAt: 1, barThr: 1.01, lull: 99, lullUntil: 0 },
  careless: { readRel: 1, readAbs: 0, place: 0, holdLead: 0, fireAt: 1, barThr: 1.01, lull: 99, lullUntil: 0, ignoreWind: true, ignoreCor: true },
};

function playMatch(model, random) {
  const match = core.createMatch({ random });
  const dt = 1 / 30;
  while (!match.isOver()) {
    const round = match.startRound();
    let sinceRead = 99;
    while (round.phase !== 'done') {
      if (round.phase === 'aiming') {
        const elapsed = CONFIG.shotSeconds - round.timeLeft;
        sinceRead += dt;
        if (sinceRead >= 0.25) {
          sinceRead = 0;
          const wind = model.ignoreWind ? 0 : round.crossRight() * (1 + model.readRel * randn(random)) + model.readAbs * randn(random);
          const cor = model.ignoreCor ? 0 : round.corMil;
          round.setAim(-(wind * round.windPerMs + cor) + model.place * randn(random), model.place * randn(random));
        }
        const calm = elapsed >= model.lullUntil || Math.abs(round.crossRight() * round.windPerMs) < model.lull;
        round.setHolding(model.holdLead > 0 && elapsed >= model.fireAt - model.holdLead && calm);
        if (elapsed >= model.fireAt && calm && Math.abs(round.bar()) < model.barThr) round.fire();
      } else round.setHolding(false);
      round.advance(dt);
    }
    match.finishRound();
  }
  return match;
}

function passRate(model, matches, seed) {
  const random = seeded(seed);
  let passes = 0;
  let sum = 0;
  const perTier = { easy: [], medium: [], hard: [] };
  for (let i = 0; i < matches; i += 1) {
    const match = playMatch(model, random);
    if (match.passed()) passes += 1;
    sum += match.total;
    match.history.forEach((entry) => perTier[entry.tier].push(entry.score));
  }
  const mean = (list) => list.reduce((a, b) => a + b, 0) / Math.max(1, list.length);
  return { pass: passes / matches, mean: sum / matches, easy: mean(perTier.easy), medium: mean(perTier.medium), hard: mean(perTier.hard) };
}

test('calibration: the levels are ordered, hard is reachable and every variable matters', () => {
  const N = 120;
  const result = {};
  Object.entries(MODELS).forEach(([name, model], index) => { result[name] = passRate(model, N, 100 + index); });

  // Cada nivel puntúa menos que el anterior incluso para quien juega bien.
  assert.ok(result.good.easy > result.good.medium + 60, JSON.stringify(result.good));
  assert.ok(result.good.medium > result.good.hard + 60, JSON.stringify(result.good));
  // El Difícil no es imposible para un tirador atento (media por ronda de al menos ~25 sobre 500).
  assert.ok(result.expert.hard > 100 && result.expert.hard < 330, JSON.stringify(result.expert));
  // Quien lee bien el viento y respira gana con frecuencia razonable, sin ser un paseo (diana de dificultad 8.75).
  assert.ok(result.expert.pass > 0.4 && result.expert.pass < 0.85, `expert ${result.expert.pass}`);
  assert.ok(result.good.pass > 0.3 && result.good.pass < 0.8, `good ${result.good.pass}`);
  // Un jugador medio rara vez llega y el descuidado nunca.
  assert.ok(result.average.pass < 0.5, `average ${result.average.pass}`);
  assert.equal(result.careless.pass, 0);
  assert.equal(result.rushed.pass, 0);
  // Quitar cualquiera de las variables empeora claramente el resultado.
  for (const name of ['noBreath', 'noBar', 'noCoriolis']) {
    assert.ok(result[name].mean < result.good.mean - 100, `${name} ${result[name].mean} vs ${result.good.mean}`);
    assert.ok(result[name].pass < result.good.pass, name);
  }
  assert.ok(result.noBar.pass < 0.15, `noBar ${result.noBar.pass}`);
});

// ---------------------------------------------------------------------------
// Página, registro y textos
// ---------------------------------------------------------------------------
function registry() {
  const context = vm.createContext({ window: {} });
  vm.runInContext(read('scripts/games-data.js'), context);
  return [...context.window.NSG_GAMES];
}

test('the game is registered once, with difficulty 7-10 out of 10, and its page exists', () => {
  const games = registry().filter((game) => game.id === 'francotirador');
  assert.equal(games.length, 1);
  const [game] = games;
  assert.equal(game.difficulty, '7-10');
  assert.equal(game.href, `${GAME_DIR}/index.html`);
  assert.equal(game.locked, false);
  assert.ok(fs.existsSync(path.join(root, game.href)));
  assert.ok(game.title.es && game.title.en && game.description.es && game.description.en);
});

test('the page loads the shared modules in order, the debug indicator and the core before the game', () => {
  const html = read(`${GAME_DIR}/index.html`);
  const order = ['styles/common.css', 'francotirador.css', 'scripts/storage.js', 'scripts/localization-data.js', 'scripts/i18n.js',
    'scripts/quit-confirm.js', 'scripts/secrets.js', 'debug/difficulty-debug.js', 'francotirador-core.js', 'francotirador.js"'];
  let last = -1;
  for (const item of order) {
    const at = html.indexOf(item);
    assert.ok(at > last, item);
    last = at;
  }
  assert.ok(html.includes('scripts/sequence.js') && html.includes('styles/sequence.css'));
  assert.ok(html.includes('id="tutorial-close"') && html.includes('role="dialog"'));
});

test('every translation key used by the page exists in Spanish and English', () => {
  const used = new Set();
  for (const source of [read(`${GAME_DIR}/index.html`), read(`${GAME_DIR}/francotirador.js`)]) {
    for (const match of source.matchAll(/francotirador\.[A-Za-z0-9_]+/g)) used.add(match[0]);
  }
  for (const place of CONFIG.places) used.add(`francotirador.place.${place.id}`);
  for (const tier of CONFIG.tiers) used.add(`francotirador.tier.${tier.id}`);
  ['francotirador.js', 'francotirador.css', 'francotirador.place', 'francotirador.tier'].forEach((prefix) => used.delete(prefix));
  assert.deepEqual(require('./helpers/texts.cjs').missingKeys(used), []);
});

// ---------------------------------------------------------------------------
// Flujo de la página con un DOM mínimo y reloj virtual
// ---------------------------------------------------------------------------
function harness(variant = 'francotirador') {
  let now = 1000;
  let nextTimer = 0;
  const timers = new Map();
  const elements = new Map();
  const awards = [];
  const debugTiers = [];
  const listeners = { document: { keydown: [], keyup: [] }, window: {} };
  let document;

  function makeElement() {
    const classes = new Set();
    const target = {
      style: { setProperty() {} },
      dataset: {},
      inert: false,
      hidden: false,
      isConnected: true,
      innerHTML: '',
      textContent: '',
      scrollTop: 0,
      listeners: {},
      classList: {
        add: (name) => classes.add(name),
        remove: (name) => classes.delete(name),
        toggle: (name, on) => { if (on === undefined ? !classes.has(name) : on) classes.add(name); else classes.delete(name); },
        contains: (name) => classes.has(name),
      },
      offsetWidth: 0,
      tabIndex: 0,
      addEventListener(type, fn) { (target.listeners[type] ||= []).push(fn); },
      focus() { document.activeElement = target; },
      getContext: () => null,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }),
      getClientRects: () => (target.style.display === 'none' ? [] : [{}]),
      querySelector: (selector) => get(selector),
      querySelectorAll: () => [],
      replaceChildren() {},
      append() {},
      prepend() {},
      setAttribute() {},
      hasAttribute: () => false,
      matches: () => false,
    };
    return target;
  }

  const get = (selector) => {
    if (!elements.has(selector)) elements.set(selector, makeElement());
    return elements.get(selector);
  };

  document = {
    activeElement: null,
    body: { children: [], appendChild() {}, dataset: { sniper: variant } },
    querySelector: get,
    querySelectorAll: () => [],
    createElement: makeElement,
    addEventListener(type, fn, capture = false) { (listeners.document[type] ||= []).push({ fn, capture }); },
  };

  const schedule = (fn, delay, repeat) => {
    const id = ++nextTimer;
    timers.set(id, { fn, due: now + delay, delay, repeat });
    return id;
  };

  const context = vm.createContext({
    document,
    console,
    Date: { now: () => now },
    Math: Object.create(Math),
    window: {
      location: { href: '' },
      addEventListener() {},
      NSG_I18N: { t: (key) => key, getLang: () => 'es', applyStaticTranslations() {} },
      NSG_MESSAGES: { random: () => 'GG' },
      NSG_DIFFICULTY_DEBUG: { create: () => ({ setCurrent: (tier) => debugTiers.push(tier) }) },
      NSG: {
        markGamePlayed: (id) => awards.push(`played:${id}`),
        addPendingScore: (score) => awards.push(score),
      },
    },
    setInterval: (fn, delay) => schedule(fn, delay, true),
    setTimeout: (fn, delay) => schedule(fn, delay, false),
    clearInterval: (id) => timers.delete(id),
    clearTimeout: (id) => timers.delete(id),
  });
  context.window.addEventListener = (type, fn) => { (listeners.window[type] ||= []).push(fn); };
  context.window.NSG_SNIPER_CORE = undefined;
  vm.runInContext(read(`${GAME_DIR}/francotirador-core.js`), context);
  vm.runInContext(read(`${GAME_DIR}/francotirador.js`), context);

  function advance(ms) {
    const end = now + ms;
    for (;;) {
      const item = [...timers.entries()].filter(([, timer]) => timer.due <= end).sort((a, b) => a[1].due - b[1].due)[0];
      if (!item) break;
      const [id, timer] = item;
      now = timer.due;
      if (timer.repeat) timer.due += timer.delay; else timers.delete(id);
      timer.fn();
    }
    now = end;
  }

  function key(name, type = 'keydown', extra = {}) {
    let stopped = false;
    const event = { key: name, code: extra.code || '', repeat: false, shiftKey: false, ctrlKey: false, metaKey: false, altKey: false,
      preventDefault() {}, stopPropagation() { stopped = true; }, stopImmediatePropagation() { stopped = true; }, ...extra };
    const list = listeners.document[type] || [];
    for (const { fn, capture } of list) if (capture && !stopped) fn(event);
    for (const { fn, capture } of list) if (!capture && !stopped) fn(event);
    return { stopped };
  }

  const click = (selector) => (get(selector).listeners.click || []).forEach((fn) => fn({}));
  const run = (code) => vm.runInContext(code, context);
  return { advance, key, click, run, get, awards, debugTiers, window: context.window, document, listeners };
}

test('the guide opens on entry, closes with X or Escape and then shows the usual start screen', () => {
  const h = harness();
  assert.equal(h.get('#tutorial').style.display, 'flex');
  assert.equal(h.document.activeElement, h.get('#tutorial-close'));
  // Escape cierra la guía y no llega al aviso de salida.
  assert.equal(h.key('Escape').stopped, true);
  assert.equal(h.get('#tutorial').style.display, 'none');
  assert.equal(h.document.activeElement, h.get('.btn-primary'));

  const second = harness();
  second.click('#tutorial-close');
  assert.equal(second.get('#tutorial').style.display, 'none');
  assert.equal(second.document.activeElement, second.get('.btn-primary'));
  second.click('#guide-btn');
  assert.equal(second.get('#tutorial').style.display, 'flex');
});

test('the game does not react to the keyboard while the guide is open', () => {
  const h = harness();
  h.click('#tutorial-close');
  h.click('#guide-btn');
  assert.equal(h.run('mode'), 'intro');
  h.key(' ');
  assert.equal(h.run('round'), null);
});

test('start marks the game as played, uses the tier for the debug indicator and pauses completely', () => {
  const h = harness();
  h.click('#tutorial-close');
  h.click('#start-btn');
  assert.deepEqual(h.awards, ['played:francotirador']);
  assert.equal(h.run('mode'), 'playing');
  assert.equal(h.debugTiers.length, 1);
  assert.ok(h.run('CONFIG.tiers').includes(h.debugTiers[0]));
  assert.equal(h.run('window.NSG_GAME_CONTROL.isActive()'), true);

  h.advance(2000);
  const left = h.run('round.timeLeft');
  assert.ok(left < 18.5 && left > 17.5, left);
  assert.equal(h.run('window.NSG_GAME_CONTROL.pause()'), true);
  h.advance(30000);
  assert.equal(h.run('round.timeLeft'), left); // la pausa congela reloj y viento
  h.key(' ');
  assert.equal(h.run('round.shots.length'), 0); // y las entradas
  h.run('window.NSG_GAME_CONTROL.resume()');
  h.advance(1000);
  assert.ok(h.run('round.timeLeft') < left - 0.8);
});

test('keyboard: arrows and WASD move the scope, space fires and Shift holds the breath', () => {
  const h = harness();
  h.click('#tutorial-close');
  h.click('#start-btn');
  h.key('ArrowRight', 'keydown', { code: 'ArrowRight' });
  h.advance(500);
  h.key('ArrowRight', 'keyup', { code: 'ArrowRight' });
  const moved = h.run('round.aim.x');
  assert.ok(moved > 0.2, moved);
  h.key('a', 'keydown', { code: 'KeyA' });
  h.advance(1200);
  h.key('a', 'keyup', { code: 'KeyA' });
  assert.ok(h.run('round.aim.x') < moved);

  h.key('Shift', 'keydown', { shiftKey: true });
  assert.equal(h.run('round.holdRequested'), true);
  h.key('Shift', 'keyup');
  assert.equal(h.run('round.holdRequested'), false);
  h.key('c', 'keydown', { code: 'KeyC' });
  assert.equal(h.run('round.holdRequested'), true);
  h.key('c', 'keyup', { code: 'KeyC' });

  h.key(' ', 'keydown', { code: 'Space' });
  assert.equal(h.run('round.shots.length'), 1);
  assert.equal(h.run('round.phase'), 'flight');
  h.key(' ', 'keydown', { code: 'Space' });
  assert.equal(h.run('round.shots.length'), 1);
});

test('mouse: the scope follows the pointer, left click fires and right click holds the breath', () => {
  const h = harness();
  h.click('#tutorial-close');
  h.click('#start-btn');
  const canvas = h.get('#scope');
  const fire = (type, event) => (canvas.listeners[type] || []).forEach((fn) => fn({ preventDefault() {}, pointerId: 1, ...event }));
  fire('pointermove', { clientX: 960 * 0.75, clientY: 540 * 0.5 });
  assert.ok(Math.abs(h.run('round.aim.x') - 5) < 1e-9);
  assert.ok(Math.abs(h.run('round.aim.y')) < 1e-9);
  fire('pointerdown', { button: 2, clientX: 480, clientY: 270 });
  assert.equal(h.run('round.holdRequested'), true);
  fire('pointerup', { button: 2 });
  assert.equal(h.run('round.holdRequested'), false);
  fire('pointerdown', { button: 0, clientX: 480, clientY: 270 });
  assert.equal(h.run('round.shots.length'), 1);
});

test('full game: five rounds, the reward only at 1500 and nothing is awarded on a loss', () => {
  const h = harness();
  h.click('#tutorial-close');
  h.click('#start-btn');
  // Sin tocar nada el rifle dispara solo cada 20 s: 5 rondas de 5 disparos.
  for (let round = 1; round <= 5; round += 1) {
    assert.equal(h.run('match.roundIndex'), round - 1);
    for (let i = 0; i < 400 && h.run('mode') === 'playing'; i += 1) h.advance(1000);
    if (round < 5) {
      assert.equal(h.run('mode'), 'between');
      assert.equal(h.run('window.NSG_GAME_CONTROL.isActive()'), true);
      h.click('#next-btn');
      assert.equal(h.run('mode'), 'playing');
    }
  }
  assert.equal(h.run('mode'), 'ended');
  assert.equal(h.run('match.total') < 1500, true);
  assert.deepEqual(h.awards, ['played:francotirador']);
  assert.equal(h.run('window.NSG_GAME_CONTROL.isActive()'), false);

  // Segunda partida: con 1500 antes de la última ronda se cobran los 25000.
  h.click('#replay-btn');
  for (let round = 1; round <= 5; round += 1) {
    if (round === 5) h.run('match.total = 1500');
    for (let i = 0; i < 400 && h.run('mode') === 'playing'; i += 1) h.advance(1000);
    if (round < 5) h.click('#next-btn');
  }
  assert.equal(h.run('mode'), 'ended');
  assert.equal(h.run('match.passed()'), true);
  assert.deepEqual(h.awards, ['played:francotirador', 'played:francotirador', 25000]);
});


// ---------------------------------------------------------------------------
// Francotirador 2 y 3: dianas en movimiento, más tiempo y más recompensa
// ---------------------------------------------------------------------------
const VARIANT_IDS = ['francotirador2', 'francotirador3'];
const variantCfg = (id) => core.configFor(id);

test('variants change the clock, the shots per round, the reward and the targets; the points per zone stay the same', () => {
  const base = variantCfg('francotirador');
  const two = variantCfg('francotirador2');
  const three = variantCfg('francotirador3');
  assert.deepEqual([base.shotSeconds, two.shotSeconds, three.shotSeconds], [20, 25, 33]);
  assert.deepEqual([base.rewardPoints, two.rewardPoints, three.rewardPoints], [25000, 50000, 100000]);
  assert.deepEqual([base.shotsPerRound, two.shotsPerRound, three.shotsPerRound], [5, 2, 4]);
  // El objetivo es el mismo 60 % del máximo de la partida en las tres.
  assert.deepEqual([base, two, three].map((cfg) => cfg.passScore / core.maxMatchScore(cfg)), [0.6, 0.6, 0.6]);
  assert.deepEqual([core.maxMatchScore(two), core.maxMatchScore(three)], [1000, 2000]);
  assert.deepEqual([base.targets.length, two.targets.length, three.targets.length], [1, 1, 2]);
  assert.equal(base.targets[0].amplitude, 0);
  for (const cfg of [two, three]) {
    assert.deepEqual(cfg.zones, base.zones);
    assert.deepEqual(cfg.tiers, base.tiers);
    assert.ok(cfg.targets.every((target) => target.amplitude > 0));
  }
});

test('the target of Francotirador 1 stays still and its random sequence does not change', () => {
  const a = core.createRound({ tier: CONFIG.tiers[0], random: seeded(7) });
  const b = core.createRound({ tier: CONFIG.tiers[0], random: seeded(7), cfg: variantCfg('francotirador') });
  a.advance(5);
  b.advance(5);
  assert.deepEqual(a.targetX, [0]);
  assert.deepEqual(b.targetX, [0]);
  assert.equal(a.wind.speed, b.wind.speed);
});

test('Francotirador 2 moves its target from side to side within the view and at a speed the keyboard can follow', () => {
  const cfg = variantCfg('francotirador2');
  const round = core.createRound({ tier: calmTier, random: seeded(3), cfg });
  let min = Infinity;
  let max = -Infinity;
  let fastest = 0;
  let previous = round.targetX[0];
  for (let i = 0; i < 60 * 40; i += 1) {
    round.advance(1 / 60);
    const x = round.targetX[0];
    min = Math.min(min, x);
    max = Math.max(max, x);
    fastest = Math.max(fastest, Math.abs(x - previous) * 60);
    previous = x;
  }
  assert.ok(min < -4.9 && max > 4.9, `${min} ${max}`);
  assert.ok(max + 2.6 < cfg.view.width / 2, 'the target never leaves the view');
  assert.ok(fastest < cfg.aim.fastSpeed, fastest);
});

test('Francotirador 3 has two targets that go in opposite directions and cross', () => {
  const cfg = variantCfg('francotirador3');
  const round = core.createRound({ tier: calmTier, random: seeded(5), cfg });
  assert.equal(round.targetX.length, 2);
  let crossings = 0;
  let sign = Math.sign(round.targetX[0] - round.targetX[1]);
  for (let i = 0; i < 60 * 33; i += 1) {
    const before = [...round.targetX];
    round.advance(1 / 60);
    const d0 = round.targetX[0] - before[0];
    const d1 = round.targetX[1] - before[1];
    assert.ok(d0 * d1 <= 1e-12, 'they never move in the same direction');
    const now = Math.sign(round.targetX[0] - round.targetX[1]);
    if (now !== 0 && now !== sign) { crossings += 1; sign = now; }
  }
  assert.ok(crossings >= 3, crossings);
});

test('a shot scores against the position of the target when the trigger is pulled, and the hole stays on that target', () => {
  const cfg = variantCfg('francotirador2');
  const round = core.createRound({ tier: calmTier, random: seeded(11), cfg });
  round.advance(3);
  const x = round.targetX[0];
  const shot = round.fire();
  assert.deepEqual(shot.targetX, [x]);
  round.advance(10); // la diana sigue moviéndose durante el vuelo
  assert.notEqual(round.targetX[0], x);
  assert.ok(Math.abs(shot.rel.x - (shot.impact.x - x)) < 1e-9);
  assert.ok(Math.abs(shot.radiusMetres - (Math.hypot(shot.rel.x, shot.rel.y) * round.distance) / 1000) < 1e-9);
});

test('with two overlapping targets the shot scores with the closest one', () => {
  const cfg = variantCfg('francotirador3');
  const round = core.createRound({ tier: calmTier, random: seeded(2), cfg });
  round.advance(1.3);
  const [a, b] = round.targetX;
  assert.notEqual(a, b);
  round.setAim(b, 0);
  const shot = round.fire();
  round.advance(10);
  assert.ok(shot.radiusMetres <= (Math.hypot(shot.impact.x - a, shot.impact.y) * round.distance) / 1000 + 1e-9);
  assert.ok(shot.radiusMetres <= (Math.hypot(shot.impact.x - b, shot.impact.y) * round.distance) / 1000 + 1e-9);
});

test('the variants are registered with their card difficulty and their pages exist', () => {
  const games = registry();
  for (const [id, difficulty] of [['francotirador2', 9.25], ['francotirador3', 10]]) {
    const found = games.filter((game) => game.id === id);
    assert.equal(found.length, 1, id);
    assert.equal(found[0].difficulty, difficulty);
    assert.equal(found[0].href, `juegos/Francotirador/${id}/index.html`);
    assert.equal(found[0].locked, false);
    assert.ok(fs.existsSync(path.join(root, found[0].href)));
    assert.ok(found[0].title.es && found[0].title.en && found[0].description.es && found[0].description.en);
  }
});

test('variant pages declare their game, reuse the shared script and only use existing translation keys', () => {
  for (const id of VARIANT_IDS) {
    const html = read(`juegos/Francotirador/${id}/index.html`);
    assert.ok(html.includes(`data-sniper="${id}"`), id);
    for (const file of ['francotirador.css', 'francotirador-core.js', 'francotirador.js']) {
      assert.ok(html.includes(`../francotirador/${file}`), `${id} ${file}`);
    }
    assert.ok(html.includes('debug/difficulty-debug.js') && html.includes('scripts/sequence.js'));
    const used = new Set((html.match(/francotirador\d?\.[A-Za-z0-9_]+/g) || []).filter((key) => !/\.(js|css)$/.test(key)));
    used.add(`games.${id}.title`);
    assert.deepEqual(require('./helpers/texts.cjs').missingKeys(used), [], id);
  }
});

test('variant pages: each one starts with its own clock, id and reward', () => {
  for (const [id, seconds, reward] of [['francotirador2', 25, 50000], ['francotirador3', 33, 100000]]) {
    const h = harness(id);
    h.click('#tutorial-close');
    h.click('#start-btn');
    assert.deepEqual(h.awards, [`played:${id}`]);
    assert.equal(h.run('round.timeLeft'), seconds);
    assert.equal(h.run('round.targetX.length'), id === 'francotirador3' ? 2 : 1);
    // Sin tocar nada el rifle dispara solo; con el objetivo antes de la última ronda se cobra la recompensa de la variante.
    for (let round = 1; round <= 5; round += 1) {
      if (round === 5) h.run('match.total = CONFIG.passScore');
      for (let i = 0; i < 600 && h.run('mode') === 'playing'; i += 1) h.advance(1000);
      if (round < 5) h.click('#next-btn');
    }
    assert.equal(h.run('mode'), 'ended');
    assert.deepEqual(h.awards, [`played:${id}`, reward]);
  }
});

test('each variant ends the round after exactly its shots per round, however long the player waits', () => {
  for (const [id, shots] of [['francotirador', 5], ['francotirador2', 2], ['francotirador3', 4]]) {
    const cfg = variantCfg(id);
    const round = core.createRound({ tier: cfg.tiers[2], random: seeded(9), cfg });
    let ended = 0;
    for (let i = 0; i < 60 * 600 && round.phase !== 'done'; i += 1) {
      if (round.phase === 'aiming' && round.timeLeft < cfg.shotSeconds - 1) round.fire();
      round.advance(1 / 60).forEach((event) => { if (event.type === 'end') ended += 1; });
    }
    assert.equal(round.shots.length, shots, id);
    assert.equal(round.phase, 'done');
    assert.equal(ended, 1);
    assert.equal(round.fire(), null);
    assert.equal(round.shots.length, shots);
  }
});
