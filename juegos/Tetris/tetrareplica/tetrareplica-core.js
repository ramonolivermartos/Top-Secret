// Lógica pura de «Réplica de bloques» (sin DOM): piezas, figuras objetivo,
// detección de errores irreparables y simulación de la partida.
(function (root) {
  const COLS = 10;
  const ROWS = 12;
  const TARGET_ROWS = 7;
  const CELLS = COLS * ROWS;

  const CONFIG = {
    previewMs: 20000, // la figura de la izquierda se ve sola antes de que caiga ninguna pieza
    spawnMs: 3500,
    gravityMs: 800,
    stepMs: 50,
    scorePoints: 70,
    scoreIntervalMs: 32000,
    winBonus: 150,
    solverCap: 3000,
  };

  // I, O, T, S, Z, J, L
  const SHAPES = [
    [[0, 0], [1, 0], [2, 0], [3, 0]],
    [[0, 0], [1, 0], [0, 1], [1, 1]],
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[2, 0], [0, 1], [1, 1], [2, 1]],
  ];

  const ORIENT = SHAPES.map((base) => {
    const list = [];
    let cells = base;
    for (let rot = 0; rot < 4; rot += 1) {
      const minX = Math.min(...cells.map(([x]) => x));
      const minY = Math.min(...cells.map(([, y]) => y));
      const normal = cells.map(([x, y]) => [x - minX, y - minY]);
      list.push({
        cells: normal,
        width: Math.max(...normal.map(([x]) => x)) + 1,
        height: Math.max(...normal.map(([, y]) => y)) + 1,
      });
      cells = cells.map(([x, y]) => [-y, x]);
    }
    return list;
  });

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pieceCells(piece) {
    return ORIENT[piece.type][piece.rot].cells.map(([x, y]) => [piece.x + x, piece.y + y]);
  }

  function spawnPiece(type) {
    return { type, rot: 0, x: Math.floor((COLS - ORIENT[type][0].width) / 2), y: 0 };
  }

  // `blocked(x, y)` indica si una casilla está ocupada o fuera del tablero.
  function collides(piece, blocked) {
    return pieceCells(piece).some(([x, y]) => blocked(x, y));
  }

  function rotated(piece, blocked) {
    const rot = (piece.rot + 1) % 4;
    const before = ORIENT[piece.type][piece.rot].width;
    const after = ORIENT[piece.type][rot].width;
    const baseX = piece.x + Math.floor((before - after) / 2);
    for (const kick of [0, -1, 1, -2, 2]) {
      const candidate = { type: piece.type, rot, x: baseX + kick, y: piece.y };
      if (!collides(candidate, blocked)) return candidate;
    }
    return null;
  }

  function filledBlocked(filled) {
    return (x, y) => x < 0 || x >= COLS || y >= ROWS || (y >= 0 && filled[y * COLS + x] === 1);
  }

  // Todas las posiciones en las que una pieza puede acabar apoyada, alcanzables
  // desde la salida moviéndola, girándola y bajándola con las mismas reglas
  // que la partida.
  function lockPositions(type, blocked) {
    const start = spawnPiece(type);
    if (collides(start, blocked)) return [];
    const key = (p) => (p.rot * ROWS + p.y) * COLS + p.x;
    const seen = new Set([key(start)]);
    const stack = [start];
    const locks = new Map();
    const visit = (p) => {
      if (collides(p, blocked)) return;
      const k = key(p);
      if (seen.has(k)) return;
      seen.add(k);
      stack.push(p);
    };
    while (stack.length) {
      const p = stack.pop();
      const down = { type, rot: p.rot, x: p.x, y: p.y + 1 };
      if (collides(down, blocked)) {
        const cells = pieceCells(p).map(([x, y]) => y * COLS + x).sort((a, b) => a - b);
        locks.set(cells.join(','), cells);
      } else {
        visit(down);
      }
      visit({ type, rot: p.rot, x: p.x - 1, y: p.y });
      visit({ type, rot: p.rot, x: p.x + 1, y: p.y });
      const turned = rotated(p, blocked);
      if (turned) visit(turned);
    }
    return [...locks.values()];
  }

  function makeTarget(id, heights) {
    const mask = new Uint8Array(CELLS);
    const list = [];
    heights.forEach((h, x) => {
      for (let r = 0; r < h; r += 1) {
        const idx = (ROWS - 1 - r) * COLS + x;
        mask[idx] = 1;
        list.push(idx);
      }
    });
    return { id, heights: heights.slice(), mask, list, count: list.length, tiling: [] };
  }

  // Las zonas que quedan por rellenar deben tener un tamaño múltiplo de 4.
  function componentsDivisible(target, filled) {
    const seen = new Set();
    for (const start of target.list) {
      if (filled[start] || seen.has(start)) continue;
      let size = 0;
      const stack = [start];
      seen.add(start);
      while (stack.length) {
        const idx = stack.pop();
        size += 1;
        const x = idx % COLS;
        const neighbours = [];
        if (x > 0) neighbours.push(idx - 1);
        if (x < COLS - 1) neighbours.push(idx + 1);
        if (idx >= COLS) neighbours.push(idx - COLS);
        if (idx < CELLS - COLS) neighbours.push(idx + COLS);
        for (const n of neighbours) {
          if (target.mask[n] && !filled[n] && !seen.has(n)) {
            seen.add(n);
            stack.push(n);
          }
        }
      }
      if (size % 4 !== 0) return false;
    }
    return true;
  }

  // Busca una forma de completar la figura con piezas que puedan llegar
  // realmente a su sitio. 'unknown' (límite de búsqueda) no se castiga.
  function solve(target, filled, cap = CONFIG.solverCap) {
    const work = Uint8Array.from(filled);
    const blocked = filledBlocked(work);
    const failed = new Set();
    const plan = [];
    let nodes = 0;
    let exceeded = false;
    let remaining = target.list.reduce((n, idx) => n + (work[idx] ? 0 : 1), 0);

    const keyOf = () => target.list.map((idx) => work[idx]).join('');

    function search() {
      if (remaining === 0) return true;
      if (!componentsDivisible(target, work)) return false;
      const key = keyOf();
      if (failed.has(key)) return false;
      nodes += 1;
      if (nodes > cap) {
        exceeded = true;
        return false;
      }
      for (let type = 0; type < SHAPES.length; type += 1) {
        for (const cells of lockPositions(type, blocked)) {
          if (!cells.every((idx) => target.mask[idx] && !work[idx])) continue;
          cells.forEach((idx) => { work[idx] = 1; });
          remaining -= 4;
          plan.push(cells);
          if (search()) return true;
          plan.pop();
          remaining += 4;
          cells.forEach((idx) => { work[idx] = 0; });
          if (exceeded) return false;
        }
      }
      failed.add(key);
      return false;
    }

    if (search()) return { status: 'solved', plan };
    return { status: exceeded ? 'unknown' : 'dead', plan: [] };
  }

  // 'won' (idéntica), 'dead' (ya no se puede completar) u 'ok'.
  function analyze(target, filled) {
    let count = 0;
    for (let idx = 0; idx < CELLS; idx += 1) {
      if (!filled[idx]) continue;
      if (!target.mask[idx]) return { state: 'dead', reason: 'outside' };
      count += 1;
    }
    if (count === target.count) return { state: 'won' };
    const result = solve(target, filled);
    return { state: result.status === 'dead' ? 'dead' : 'ok', reason: 'unsolvable' };
  }

  // Catálogo estable de figuras escalonadas (mismo seed → mismas figuras).
  function buildCatalogue(count = 20, seed = 20260217) {
    const random = mulberry32(seed);
    const list = [];
    const seen = new Set();
    for (let guard = 0; list.length < count && guard < 20000; guard += 1) {
      const width = 6 + Math.floor(random() * 3);
      const peak = 1 + Math.floor(random() * (width - 2));
      const top = 3 + Math.floor(random() * 4);
      const heights = new Array(width).fill(0);
      heights[0] = 1 + Math.floor(random() * 2);
      for (let i = 1; i < peak; i += 1) {
        heights[i] = Math.min(top, heights[i - 1] + (random() < 0.6 ? 1 : 0) + (random() < 0.15 ? 1 : 0));
      }
      heights[peak] = top;
      heights[width - 1] = 1 + Math.floor(random() * 2);
      for (let i = width - 2; i > peak; i -= 1) {
        heights[i] = Math.min(top, heights[i + 1] + (random() < 0.6 ? 1 : 0) + (random() < 0.15 ? 1 : 0));
      }
      const total = heights.reduce((a, b) => a + b, 0);
      if (total < 28 || total > 36 || total % 4 !== 0) continue;
      if (new Set(heights).size < 3) continue;
      const signature = heights.join('-');
      const mirror = heights.slice().reverse().join('-');
      if (seen.has(signature) || seen.has(mirror)) continue;
      const offset = Math.floor((COLS - width) / 2);
      const placed = new Array(COLS).fill(0);
      heights.forEach((h, i) => { placed[offset + i] = h; });
      const target = makeTarget(list.length + 1, placed);
      const result = solve(target, new Uint8Array(CELLS), 20000);
      if (result.status !== 'solved') continue;
      target.tiling = result.plan;
      seen.add(signature);
      list.push(target);
    }
    return list;
  }

  // Catálogo fijo de 20 figuras (alturas por columna). Salió de `buildCatalogue()`
  // con su seed por defecto; una prueba comprueba que siguen coincidiendo y que
  // todas se pueden construir. Generarlas al cargar tardaría varios segundos.
  const CATALOGUE_HEIGHTS = [
  [0, 1, 2, 6, 6, 6, 4, 2, 1, 0],
  [0, 2, 5, 5, 4, 4, 4, 2, 2, 0],
  [0, 2, 5, 5, 5, 5, 4, 2, 0, 0],
  [0, 2, 4, 6, 6, 6, 6, 4, 2, 0],
  [0, 1, 5, 5, 5, 4, 4, 3, 1, 0],
  [0, 1, 6, 6, 6, 4, 3, 2, 0, 0],
  [0, 1, 2, 3, 4, 5, 6, 6, 1, 0],
  [0, 2, 4, 4, 5, 6, 3, 2, 2, 0],
  [0, 1, 2, 3, 6, 6, 5, 3, 2, 0],
  [0, 2, 2, 3, 4, 5, 5, 5, 2, 0],
  [0, 2, 3, 4, 5, 6, 6, 2, 0, 0],
  [0, 2, 2, 4, 6, 5, 4, 3, 2, 0],
  [0, 1, 2, 6, 6, 6, 5, 4, 2, 0],
  [0, 2, 3, 3, 4, 5, 5, 5, 1, 0],
  [0, 2, 3, 5, 5, 5, 5, 2, 1, 0],
  [0, 2, 3, 5, 5, 6, 5, 4, 2, 0],
  [0, 1, 1, 6, 6, 5, 4, 3, 2, 0],
  [0, 1, 1, 5, 5, 5, 5, 4, 2, 0],
  [0, 2, 6, 6, 6, 6, 5, 3, 2, 0],
  [0, 2, 3, 6, 4, 4, 4, 3, 2, 0],
  ];

  function catalogue() {
    return CATALOGUE_HEIGHTS.map((heights, i) => makeTarget(i + 1, heights));
  }

  // Calcula (una vez) cómo se puede montar la figura con piezas, para dibujarla.
  function withTiling(target) {
    if (!target.tiling.length) target.tiling = solve(target, new Uint8Array(CELLS), 20000).plan;
    return target;
  }

  function timeScore(elapsedMs) {
    return Math.floor((elapsedMs * CONFIG.scorePoints) / CONFIG.scoreIntervalMs);
  }

  function createSim(options) {
    const { target } = options;
    const random = options.random || Math.random;
    const config = Object.assign({}, CONFIG, options.config);
    const filled = new Uint8Array(CELLS);
    const colors = new Array(CELLS).fill(null);
    const active = [];
    let elapsed = 0;
    let nextSpawn = 0;
    let nextId = 1;
    let status = 'playing';
    let reason = null;

    const randomColor = () => `hsl(${Math.floor(random() * 360)} 72% 55%)`;
    const staticBlocked = filledBlocked(filled);
    const blockedFor = (self) => (x, y) => staticBlocked(x, y)
      || active.some((p) => p !== self && pieceCells(p).some(([cx, cy]) => cx === x && cy === y));

    function finish(next, why) {
      status = next;
      reason = why || null;
    }

    function lock(piece) {
      pieceCells(piece).forEach(([x, y]) => {
        filled[y * COLS + x] = 1;
        colors[y * COLS + x] = piece.color;
      });
      active.splice(active.indexOf(piece), 1);
      const result = analyze(target, filled);
      if (result.state === 'won') finish('won');
      else if (result.state === 'dead') finish('lost', result.reason);
    }

    function trySpawn() {
      const piece = spawnPiece(Math.floor(random() * SHAPES.length));
      if (collides(piece, staticBlocked)) {
        finish('lost', 'overflow');
        return;
      }
      if (collides(piece, blockedFor(null))) return;
      piece.id = nextId;
      nextId += 1;
      piece.color = randomColor();
      piece.nextFall = elapsed + config.gravityMs;
      active.push(piece);
      nextSpawn += config.spawnMs;
    }

    function gravity(piece) {
      while (status === 'playing' && active.includes(piece) && elapsed >= piece.nextFall) {
        piece.nextFall += config.gravityMs;
        const down = { type: piece.type, rot: piece.rot, x: piece.x, y: piece.y + 1 };
        if (!collides(down, blockedFor(piece))) {
          piece.y += 1;
        } else if (collides(down, staticBlocked)) {
          lock(piece);
        }
      }
    }

    function tick() {
      if (elapsed >= nextSpawn) trySpawn();
      for (const piece of active.slice()) {
        if (status !== 'playing') return;
        gravity(piece);
      }
    }

    const controlled = () => (status === 'playing' ? active[0] : null);

    return {
      config,
      advance(ms) {
        let left = ms;
        while (left > 0 && status === 'playing') {
          const dt = Math.min(left, config.stepMs);
          elapsed += dt;
          left -= dt;
          tick();
        }
      },
      move(dx) {
        const p = controlled();
        if (!p) return false;
        const next = { type: p.type, rot: p.rot, x: p.x + dx, y: p.y };
        if (collides(next, blockedFor(p))) return false;
        p.x = next.x;
        return true;
      },
      rotate() {
        const p = controlled();
        if (!p) return false;
        const next = rotated(p, blockedFor(p));
        if (!next) return false;
        p.rot = next.rot;
        p.x = next.x;
        return true;
      },
      softDrop() {
        const p = controlled();
        if (!p) return false;
        const next = { type: p.type, rot: p.rot, x: p.x, y: p.y + 1 };
        if (collides(next, blockedFor(p))) return false;
        p.y += 1;
        return true;
      },
      // Elimina la pieza más antigua en caída.
      discard() {
        if (!controlled()) return false;
        active.shift();
        return true;
      },
      // Solo puntúa quien gana; perder deja la partida en 0 puntos.
      score: () => (status === 'lost' ? 0 : timeScore(elapsed) + (status === 'won' ? config.winBonus : 0)),
      get status() { return status; },
      get reason() { return reason; },
      get elapsed() { return elapsed; },
      get filled() { return filled; },
      get colors() { return colors; },
      get active() { return active; },
      get filledCount() { return filled.reduce((n, v) => n + v, 0); },
    };
  }

  const api = {
    COLS, ROWS, TARGET_ROWS, CONFIG, SHAPES, ORIENT, mulberry32, pieceCells, spawnPiece,
    collides, rotated, lockPositions, makeTarget, solve, analyze, buildCatalogue, catalogue, withTiling, CATALOGUE_HEIGHTS, timeScore, createSim,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NSG_TETRA_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis);
