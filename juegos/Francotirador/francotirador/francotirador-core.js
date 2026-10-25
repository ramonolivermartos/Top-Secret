// Lógica pura del Francotirador (sin DOM, sin tamaños de pantalla).
// Todo el espacio de apuntado va en miliradianes (mil): 1 mil = distancia/1000 metros.
// `window.NSG_SNIPER_CORE`, también `require`able para las pruebas.
(function (root) {
  // ---------------------------------------------------------------------------
  // Configuración: los valores a afinar tras jugar están todos aquí.
  // ---------------------------------------------------------------------------
  const CONFIG = {
    rounds: 5,
    shotsPerRound: 5,
    shotSeconds: 20,
    holeDelay: 0.6, // s entre el impacto y el siguiente turno (aparece el agujero)
    passScore: 1500, // puntos entre todas las rondas para cobrar la recompensa
    rewardPoints: 25000,
    // Dianas: sin `amplitude` la diana está quieta (Francotirador 1). Con ella oscila de izquierda
    // a derecha: x(t) = amplitude · sin(2π·t/period + fase), con la fase sorteada por ronda.
    // `phaseShift` (en vueltas) desfasa una diana respecto de la primera: 0,5 la hace ir al revés.
    // Velocidad máxima ≈ amplitude·2π/period (≈ 2 mil/s, por debajo del teclado rápido de 2,45).
    targets: [{ amplitude: 0, period: 1, phaseShift: 0 }],
    targetRadius: 2, // m, fijo en el mundo
    view: { width: 20, height: 11.25 }, // mil visibles, diana centrada
    // Zonas de la diana, de dentro afuera. El radio es el de la zona en metros.
    zones: [
      { id: 'bull', radius: 0.3, points: 100 },
      { id: 'inner', radius: 0.8, points: 50 },
      { id: 'middle', radius: 1.4, points: 25 },
      { id: 'outer', radius: 2, points: 10 },
    ],
    v0: 800, // m/s
    drag: 0.2, // 1/s
    windStepSeconds: 0.5,
    corFactor: 5, // Coriolis exagerado (aviso en la interfaz)
    omega: 7.292e-5,
    aim: { slowSpeed: 0.25, fastSpeed: 2.45, rampSeconds: 0.7 }, // mil/s con teclado
    breath: { max: 3, recover: 0.6, exhaustedUntil: 1.2, tremorHeld: 0.15, tremorExhausted: 1.8 },
    tremor: { min: 0.15, max: 0.4, freqs: [0.35, 0.7, 1.3, 2.1], weights: [0.5, 0.3, 0.15, 0.05], beat: 0.1, smoothing: 3 },
    pulse: { rest: 66, timeBoost: 50, holdPenalty: 3, exhaustedPenalty: 14, follow: 1.2 },
    bar: { period: 1.8, maxError: 1.0, exponent: 1.6 }, // barra de concentración
    dispersion: 0.03, // mil, sigma propia del rifle
    // Niveles: misma probabilidad cada uno (sin pesos). `windMax` es el viento máximo (m/s),
    // `gust` escala cuánto cambia el viento mientras vuela la bala y `tremor` el pulso de la mira.
    // Calibración (tests/francotirador.cjs): con la volatilidad original (gust 1) el Difícil era
    // imposible incluso leyendo el viento a la perfección (error de viento ~1,3 mil a 2150 m
    // frente a una diana de 0,9 mil de radio). Por petición del usuario el viento cambia poco
    // durante la ronda (gust 0,4-0,6): lo difícil es leerlo y compensarlo, no que se mueva solo.
    tiers: [
      { id: 'easy', label: 'Fácil', minDistance: 800, maxDistance: 1200, windMax: 6, gust: 0.4, tremor: 1 },
      { id: 'medium', label: 'Medio', minDistance: 1200, maxDistance: 1800, windMax: 9, gust: 0.5, tremor: 1 },
      { id: 'hard', label: 'Difícil', minDistance: 1800, maxDistance: 2500, windMax: 12, gust: 0.6, tremor: 1 },
    ],
    // Lugares para el Coriolis (latitud en grados; negativa = hemisferio sur).
    places: [
      { id: 'quito', latitude: -0.18 },
      { id: 'singapore', latitude: 1.35 },
      { id: 'nairobi', latitude: -1.29 },
      { id: 'tokyo', latitude: 35.68 },
      { id: 'madrid', latitude: 40.42 },
      { id: 'sydney', latitude: -33.87 },
      { id: 'buenosAires', latitude: -34.6 },
      { id: 'capeTown', latitude: -33.92 },
      { id: 'oslo', latitude: 59.91 },
      { id: 'reykjavik', latitude: 64.15 },
    ],
  };

  // Variantes de la familia (la mecánica es la misma; solo cambian estos campos de CONFIG).
  // Francotirador 2: una diana en movimiento, 2 disparos por ronda, +5 s y el doble de recompensa que la 1.
  // Francotirador 3: dos dianas que se cruzan, 4 disparos por ronda, +8 s sobre la 2 y el doble de recompensa que la 2.
  // El objetivo es el 60 % del máximo de cada partida (decisión confirmada con el usuario: mantener la proporción).
  const VARIANTS = {
    francotirador: {},
    francotirador2: {
      shotSeconds: 25,
      shotsPerRound: 2,
      passScore: 600, // 60 % del máximo (1000), como los 1500 de 2500 de la 1
      rewardPoints: 50000,
      targets: [{ amplitude: 5, period: 16, phaseShift: 0 }],
    },
    francotirador3: {
      shotSeconds: 33,
      shotsPerRound: 4,
      passScore: 1200, // 60 % del máximo (2000)
      rewardPoints: 100000,
      targets: [
        { amplitude: 5, period: 16, phaseShift: 0 },
        { amplitude: 5, period: 16, phaseShift: 0.5 },
      ],
    },
  };

  const configFor = (id) => Object.assign({}, CONFIG, VARIANTS[id] || {});

  const TAU = Math.PI * 2;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const angDiff = (a, b) => ((((b - a) % 360) + 540) % 360) - 180;
  const rad = (deg) => (deg * Math.PI) / 180;

  function randn(random) {
    const u = Math.max(random(), 1e-12);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * random());
  }

  // ---------------------------------------------------------------------------
  // Balística
  // ---------------------------------------------------------------------------
  function flightTime(distance, cfg = CONFIG) {
    return -Math.log(1 - (distance * cfg.drag) / cfg.v0) / cfg.drag;
  }

  // Deriva (mil) por cada m/s de viento cruzado: retraso sobre el vuelo ideal.
  function windPerMs(distance, cfg = CONFIG) {
    const lag = flightTime(distance, cfg) - distance / cfg.v0;
    return (lag / distance) * 1000;
  }

  // Coriolis horizontal (mil), determinista por ronda; positivo = derecha.
  function coriolis(latitude, distance, cfg = CONFIG) {
    return cfg.omega * Math.sin(rad(latitude)) * flightTime(distance, cfg) * 1000 * cfg.corFactor;
  }

  function aimSpeed(heldSeconds, cfg = CONFIG) {
    const { slowSpeed, fastSpeed, rampSeconds } = cfg.aim;
    return lerp(slowSpeed, fastSpeed, clamp(heldSeconds / rampSeconds, 0, 1));
  }

  // ---------------------------------------------------------------------------
  // Diana y puntuación
  // ---------------------------------------------------------------------------
  // Devuelve { index, zone, points } con index -1 y 0 puntos fuera de la diana.
  function zoneAt(radiusMetres, cfg = CONFIG) {
    for (let i = 0; i < cfg.zones.length; i += 1) {
      if (radiusMetres <= cfg.zones[i].radius) return { index: i, zone: cfg.zones[i].id, points: cfg.zones[i].points };
    }
    return { index: -1, zone: 'miss', points: 0 };
  }

  // Posición horizontal (mil) de una diana en el instante `clock` de la ronda.
  function targetX(target, phase, clock) {
    return target.amplitude ? target.amplitude * Math.sin((TAU * clock) / target.period + phase + TAU * target.phaseShift) : 0;
  }

  const maxRoundScore = (cfg = CONFIG) => cfg.zones[0].points * cfg.shotsPerRound;
  const maxMatchScore = (cfg = CONFIG) => maxRoundScore(cfg) * cfg.rounds;
  const passed = (total, cfg = CONFIG) => total >= cfg.passScore;

  // ---------------------------------------------------------------------------
  // Ronda: 5 disparos sobre una sola diana, a una sola distancia y lugar.
  // ---------------------------------------------------------------------------
  function createRound({ tier, random = Math.random, place, cfg = CONFIG } = {}) {
    const useTier = tier || cfg.tiers[0];
    const distance = Math.round(lerp(useTier.minDistance, useTier.maxDistance, random()) / 10) * 10;
    const usePlace = place || cfg.places[Math.floor(random() * cfg.places.length)];
    const T = flightTime(distance, cfg);
    const perMs = windPerMs(distance, cfg);
    const corMil = coriolis(usePlace.latitude, distance, cfg);
    const windMax = useTier.windMax;
    const gust = useTier.gust;

    // Viento: velocidad, procedencia en grados (0 = de cara, 90 = de la derecha).
    const baseSide = random() < 0.5 ? 60 + random() * 60 : 240 + random() * 60;
    const wind = { speed: 0, mean: lerp(windMax * 0.15, windMax * 0.8, random()), from: baseSide, base: baseSide };
    wind.speed = wind.mean;
    let windClock = 0;

    function stepWind() {
      wind.speed += (wind.mean - wind.speed) * 0.12 + randn(random) * windMax * 0.09 * gust;
      wind.speed = clamp(wind.speed, 0, windMax);
      wind.mean = clamp(wind.mean + randn(random) * windMax * 0.03 * gust, windMax * 0.15, windMax * 0.8);
      wind.from += angDiff(wind.from, wind.base) * 0.08 + randn(random) * (9 + 22 * (1 - wind.speed / windMax)) * gust;
      wind.from = ((wind.from % 360) + 360) % 360;
      if (random() < 0.06) wind.base += randn(random) * 25 * gust;
    }

    const crossRight = () => -wind.speed * Math.sin(rad(wind.from));

    // Temblor: 4 senos por eje con fases aleatorias por ronda.
    const phases = { x: cfg.tremor.freqs.map(() => random() * TAU), y: cfg.tremor.freqs.map(() => random() * TAU) };
    const tremorBase = lerp(cfg.tremor.min, cfg.tremor.max, clamp((distance - 800) / 1700, 0, 1)) * useTier.tremor;
    let clock = 0;
    let ampSmooth = tremorBase;
    let beatPhase = random();
    let beatKick = 0;
    // La fase solo se sortea si alguna diana se mueve: así la 1 conserva su secuencia aleatoria.
    const targetPhase = cfg.targets.some((target) => target.amplitude) ? random() * TAU : 0;
    let targetClock = 0;
    const targetsNow = () => cfg.targets.map((target) => targetX(target, targetPhase, targetClock));

    const state = {
      tier: useTier,
      distance,
      place: usePlace,
      flightTime: T,
      windPerMs: perMs,
      corMil,
      aim: { x: 0, y: 0 },
      phase: 'aiming', // aiming | flight | impact | done
      timeLeft: cfg.shotSeconds,
      barTime: 0,
      air: cfg.breath.max,
      exhausted: false,
      holdRequested: false,
      holding: false,
      bpm: cfg.pulse.rest,
      stress: 0,
      shots: [],
      bullet: null,
      wind,
      impactClock: 0,
      targetX: targetsNow(), // posición actual (mil) de cada diana
    };

    const clampAim = () => {
      state.aim.x = clamp(state.aim.x, -cfg.view.width / 2, cfg.view.width / 2);
      state.aim.y = clamp(state.aim.y, -cfg.view.height / 2, cfg.view.height / 2);
    };

    function tremorOffset() {
      let x = 0;
      let y = 0;
      cfg.tremor.freqs.forEach((f, i) => {
        x += cfg.tremor.weights[i] * Math.sin(TAU * f * clock + phases.x[i]);
        y += cfg.tremor.weights[i] * Math.sin(TAU * f * clock * 0.93 + phases.y[i]);
      });
      return { x: x * ampSmooth, y: y * ampSmooth + beatKick * ampSmooth };
    }

    function tremorTarget() {
      let amp = tremorBase;
      if (state.holding) amp *= cfg.breath.tremorHeld;
      else if (state.exhausted) amp *= cfg.breath.tremorExhausted;
      return amp * (1 + clamp((state.bpm - 70) / 100, -0.1, 1));
    }

    // Barra de concentración: de -1 a +1.
    const barValue = () => Math.sin((TAU * state.barTime) / cfg.bar.period);

    function updateBody(dt, aiming) {
      clock += dt;
      state.holding = state.holdRequested && !state.exhausted && state.air > 0;
      if (state.holding) {
        state.air = Math.max(0, state.air - dt);
        if (state.air <= 0) {
          state.exhausted = true;
          state.holding = false;
          state.stress += 12;
        }
      } else {
        state.air = Math.min(cfg.breath.max, state.air + cfg.breath.recover * dt);
        if (state.exhausted && state.air >= cfg.breath.exhaustedUntil) state.exhausted = false;
      }
      const elapsedShare = aiming ? 1 - state.timeLeft / cfg.shotSeconds : 0;
      let target = cfg.pulse.rest + state.stress + cfg.pulse.timeBoost * Math.pow(clamp(elapsedShare, 0, 1), 1.5);
      if (state.holding) target += cfg.pulse.holdPenalty * (cfg.breath.max - state.air);
      if (state.exhausted) target += cfg.pulse.exhaustedPenalty;
      state.bpm += (target - state.bpm) * Math.min(1, dt * cfg.pulse.follow);
      state.stress = Math.max(0, state.stress - 5 * dt);
      ampSmooth += (tremorTarget() - ampSmooth) * Math.min(1, dt * cfg.tremor.smoothing);
      beatPhase += (state.bpm / 60) * dt;
      if (beatPhase >= 1) beatPhase -= 1;
      // Latido suave (sin saltos): sube y baja una vez por pulsación.
      beatKick = cfg.tremor.beat * Math.pow(Math.sin(Math.PI * beatPhase), 2);
    }

    function fire() {
      if (state.phase !== 'aiming') return null;
      const c = barValue();
      const trem = tremorOffset();
      const concMag = cfg.bar.maxError * Math.pow(Math.abs(c), cfg.bar.exponent) * (0.55 + 0.45 * random());
      const concAngle = random() * TAU;
      const shot = {
        index: state.shots.length,
        aim: { x: state.aim.x, y: state.aim.y },
        sight: { x: state.aim.x + trem.x, y: state.aim.y + trem.y },
        tremor: trem,
        bar: c,
        conc: { x: concMag * Math.cos(concAngle), y: concMag * Math.sin(concAngle) },
        dispersion: { x: randn(random) * cfg.dispersion, y: randn(random) * cfg.dispersion },
        timeLeft: state.timeLeft,
        targetX: state.targetX.slice(), // dónde estaban las dianas al apretar el gatillo
        target: 0,
        wind: null,
        impact: null,
        radiusMetres: null,
        points: 0,
        zone: null,
      };
      state.shots.push(shot);
      state.bullet = { t: 0, x: 0, drift: 0, shot };
      state.phase = 'flight';
      state.stress += 10;
      return shot;
    }

    function land(shot) {
      const windMil = (state.bullet.drift / distance) * 1000;
      shot.wind = windMil;
      shot.impact = {
        x: shot.aim.x + shot.tremor.x + shot.conc.x + shot.dispersion.x + windMil + corMil,
        y: shot.aim.y + shot.tremor.y + shot.conc.y + shot.dispersion.y,
      };
      // La bala acierta la diana donde estaba al disparar (sin adelantarse). Con varias, cuenta la más cercana.
      let best = 0;
      let bestRadius = Infinity;
      shot.targetX.forEach((x, i) => {
        const radius = (Math.hypot(shot.impact.x - x, shot.impact.y) * distance) / 1000;
        if (radius < bestRadius) { best = i; bestRadius = radius; }
      });
      shot.target = best;
      shot.rel = { x: shot.impact.x - shot.targetX[best], y: shot.impact.y }; // respecto de su diana
      shot.radiusMetres = bestRadius;
      const hit = zoneAt(shot.radiusMetres, cfg);
      shot.points = hit.points;
      shot.zone = hit.zone;
      state.stress += hit.points > 0 ? 4 : 0;
      state.bullet = null;
    }

    // Avanza dt segundos. Devuelve la lista de sucesos ('shot', 'impact', 'turn', 'end').
    function advance(dt) {
      const events = [];
      let left = dt;
      while (left > 1e-9) {
        const h = Math.min(left, 1 / 60);
        left -= h;
        if (state.phase === 'done') break;
        windClock += h;
        targetClock += h;
        state.targetX = targetsNow();
        while (windClock >= cfg.windStepSeconds) { windClock -= cfg.windStepSeconds; stepWind(); }
        updateBody(h, state.phase === 'aiming');
        if (state.phase === 'aiming') {
          state.barTime += h;
          state.timeLeft -= h;
          if (state.timeLeft <= 0) {
            state.timeLeft = 0;
            const shot = fire(); // el rifle dispara solo con la mira y la barra tal como están
            events.push({ type: 'shot', shot, auto: true });
          }
        } else if (state.phase === 'flight') {
          const b = state.bullet;
          b.t += h;
          const vel = cfg.v0 * Math.exp(-cfg.drag * b.t);
          b.x = (cfg.v0 / cfg.drag) * (1 - Math.exp(-cfg.drag * b.t));
          b.drift += crossRight() * (1 - vel / cfg.v0) * h;
          if (b.x >= distance) {
            const shot = b.shot;
            land(shot);
            state.phase = 'impact';
            state.impactClock = cfg.holeDelay;
            events.push({ type: 'impact', shot });
          }
        } else if (state.phase === 'impact') {
          state.impactClock -= h;
          if (state.impactClock <= 0) {
            if (state.shots.length >= cfg.shotsPerRound) {
              state.phase = 'done';
              events.push({ type: 'end' });
            } else {
              state.phase = 'aiming';
              state.timeLeft = cfg.shotSeconds;
              events.push({ type: 'turn' });
            }
          }
        }
      }
      return events;
    }

    return Object.assign(state, {
      advance,
      fire,
      moveAim(dx, dy) { state.aim.x += dx; state.aim.y += dy; clampAim(); },
      setAim(x, y) { state.aim.x = x; state.aim.y = y; clampAim(); },
      setHolding(on) { state.holdRequested = !!on; },
      crossRight,
      bar: barValue,
      tremorOffset,
      score: () => state.shots.reduce((sum, shot) => sum + shot.points, 0),
    });
  }

  // ---------------------------------------------------------------------------
  // Partida: 5 rondas, cada una con nivel sorteado (1/3 cada uno, sin pesos).
  // ---------------------------------------------------------------------------
  function pickTier(random = Math.random, cfg = CONFIG) {
    return cfg.tiers[Math.min(cfg.tiers.length - 1, Math.floor(random() * cfg.tiers.length))];
  }

  function createMatch({ random = Math.random, cfg = CONFIG } = {}) {
    const match = {
      roundIndex: 0,
      roundScores: [],
      history: [], // { tier, distance, score } de cada ronda terminada
      total: 0,
      round: null,
      startRound() {
        match.round = createRound({ tier: pickTier(random, cfg), random, cfg });
        return match.round;
      },
      finishRound() {
        const score = match.round.score();
        match.roundScores.push(score);
        match.history.push({ tier: match.round.tier.id, distance: match.round.distance, score });
        match.total += score;
        match.roundIndex += 1;
        return score;
      },
      isOver: () => match.roundIndex >= cfg.rounds,
      passed: () => passed(match.total, cfg),
    };
    return match;
  }

  const api = {
    CONFIG, VARIANTS, configFor, targetX, flightTime, windPerMs, coriolis, aimSpeed, zoneAt, maxRoundScore, maxMatchScore, passed,
    createRound, createMatch, pickTier,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NSG_SNIPER_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis);
