(function (root) {
  const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];

  function pickTier(tiers, random = Math.random) {
    let roll = random() * tiers.reduce((sum, tier) => sum + tier.weight, 0);
    for (const tier of tiers) {
      if (roll < tier.weight) return tier;
      roll -= tier.weight;
    }
    return tiers[tiers.length - 1];
  }

  function neighborsOf(cell, width, height = width) {
    const x = cell % width;
    const y = Math.floor(cell / width);
    return directions.map(([dx, dy]) => [x + dx, y + dy])
      .filter(([nx, ny]) => nx >= 0 && nx < width && ny >= 0 && ny < height)
      .map(([nx, ny]) => ny * width + nx);
  }

  function shortestRoute(maze) {
    const parents = new Map([[maze.entrance, null]]);
    const queue = [maze.entrance];
    for (const cell of queue) {
      for (const next of maze.passages[cell]) {
        if (!parents.has(next)) { parents.set(next, cell); queue.push(next); }
      }
    }
    const route = [];
    for (let cell = maze.exit; cell !== null; cell = parents.get(cell)) route.unshift(cell);
    return route;
  }

  function measure(maze) {
    const route = shortestRoute(maze);
    let turns = 0;
    let branches = 0;
    for (let i = 1; i < route.length - 1; i++) {
      if (route[i] - route[i - 1] !== route[i + 1] - route[i]) turns++;
      branches += maze.passages[route[i]].length - 2;
    }
    branches += Math.max(0, maze.passages[maze.entrance].length - 1);
    return { pathLength: route.length - 1, turns, branches };
  }

  // The hint marks the middle cell of the shortest correct route.
  function hintCell(maze) {
    const route = shortestRoute(maze);
    return route[Math.floor(route.length / 2)];
  }

  function matchesTier(metrics, tier) {
    return metrics.pathLength >= tier.pathRange[0] && metrics.pathLength <= tier.pathRange[1]
      && metrics.turns >= tier.minTurns && metrics.branches >= tier.minBranches;
  }

  // 2 approaches: corner; 3: bottom edge; 4: interior. Always near the far corner.
  function pickExit(tier, random) {
    const size = tier.size;
    const between = (from, to) => from + Math.floor(random() * (to - from + 1));
    if (tier.exitApproaches === 4) return between(size - 4, size - 2) * size + between(size - 4, size - 2);
    if (tier.exitApproaches === 3) return (size - 1) * size + between(size - 4, size - 2);
    return size * size - 1;
  }

  function generateForTier(tier, previousSignature = '', random = Math.random) {
    // Never silently substitute a different tier after the weighted selection.
    for (let attempt = 0; attempt < 2000; attempt++) {
      const size = tier.size;
      const exit = pickExit(tier, random);
      const approaches = neighborsOf(exit, size);
      const real = approaches[Math.floor(random() * approaches.length)];
      const used = new Set([0, exit, ...approaches]);
      const decoyPaths = [];
      // Each false approach starts its own long corridor attached only to the exit.
      for (const fake of approaches.filter((cell) => cell !== real)) {
        const length = tier.minDecoyLength + Math.floor(random() * size);
        const path = growDecoy(fake, length, tier.minDecoyLength, used, decoyPaths, size, exit, random);
        if (!path) break;
        decoyPaths.push(path);
      }
      if (decoyPaths.length !== approaches.length - 1) continue;
      const decoy = new Set(decoyPaths.flat());
      // Corridors are the expensive part, so each layout is tried with several spanning trees.
      for (let tree = 0; tree < 12; tree++) {
        const maze = generate(size, size, random, decoy, exit);
        for (const path of decoyPaths) {
          connect(maze, exit, path[0]);
          for (let i = 1; i < path.length; i++) connect(maze, path[i - 1], path[i]);
        }
        if (!matchesTier(measure(maze), tier)) continue;
        if (!addReturnPaths(maze, tier, random, decoy)) continue;
        const metrics = measure(maze);
        if (matchesTier(metrics, tier) && signature(maze) !== previousSignature) {
          return { ...maze, tier, metrics, hint: tier.hint ? hintCell(maze) : null };
        }
      }
    }
    throw new Error('Could not generate a maze within the selected difficulty range.');
  }

  // Randomized depth-first corridor that backtracks when stuck and never splits the playable board.
  function growDecoy(start, length, minLength, used, decoyPaths, size, exit, random) {
    const previous = decoyPaths.flat();
    // Options are popped from the end: cells farther from the exit (with jitter) go first.
    const distance = (cell) => Math.abs(cell % size - exit % size) + Math.abs(Math.floor(cell / size) - Math.floor(exit / size));
    const outward = (cell) => neighborsOf(cell, size).map((next) => [next, distance(next) + random() * 3])
      .sort((a, b) => a[1] - b[1]).map(([next]) => next);
    if (!playableConnected(new Set([...previous, start]), size, exit)) return null;
    for (let retry = 0; retry < 6; retry++) {
      const path = [start];
      const taken = new Set([...previous, start]);
      const pending = [outward(start)];
      let best = null;
      for (let steps = 0; steps < 600 && path.length < length && path.length; steps++) {
        const options = pending[pending.length - 1];
        const next = options.pop();
        if (next === undefined) {
          if (path.length >= minLength && (!best || path.length > best.length)) best = path.slice();
          taken.delete(path.pop()); pending.pop();
          continue;
        }
        if (used.has(next) || taken.has(next)) continue;
        taken.add(next);
        if (!playableConnected(taken, size, exit)) { taken.delete(next); continue; }
        path.push(next);
        pending.push(outward(next));
      }
      const candidate = path.length >= length ? path : best;
      if (!candidate) continue;
      candidate.forEach((cell) => used.add(cell));
      return candidate;
    }
    return null;
  }

  function shuffled(items, random) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  // The exit is a leaf: playable cells must stay connected without passing through it.
  function playableConnected(decoy, size, exit) {
    const reached = new Set([0]);
    const queue = [0];
    for (const cell of queue) for (const next of cell === exit ? [] : neighborsOf(cell, size)) {
      if (!decoy.has(next) && !reached.has(next)) { reached.add(next); queue.push(next); }
    }
    return reached.size === size * size - decoy.size;
  }

  function connect(maze, a, b) {
    if (!maze.passages[a].includes(b)) {
      maze.passages[a].push(b);
      maze.passages[b].push(a);
    }
  }

  function addReturnPaths(maze, tier, random, decoy) {
    const candidates = [];
    for (let cell = 0; cell < maze.passages.length; cell++) {
      for (const next of [cell % maze.width < maze.width - 1 ? cell + 1 : -1, cell + maze.width]) {
        if (next < 0 || next >= maze.passages.length || next === maze.exit || cell === maze.exit) continue;
        // Return circuits must never open a route into the decoy region.
        if (decoy.has(cell) || decoy.has(next)) continue;
        if (!maze.passages[cell].includes(next)) candidates.push([cell, next]);
      }
    }
    shuffled(candidates, random);
    // Add real cycles away from the exit, while keeping the measured difficulty.
    let added = 0;
    for (const [a, b] of candidates) {
      connect(maze, a, b);
      if (matchesTier(measure(maze), tier)) added++;
      else { maze.passages[a].pop(); maze.passages[b].pop(); }
      if (added === tier.returnPaths) break;
    }
    if (added < tier.returnPaths) return false;
    const reached = new Set([maze.entrance]);
    const queue = [maze.entrance];
    for (const cell of queue) for (const next of maze.passages[cell]) {
      if (next !== maze.exit && !reached.has(next)) { reached.add(next); queue.push(next); }
    }
    return maze.passages[maze.exit].filter((cell) => reached.has(cell)).length === 1;
  }

  // Start with a spanning tree; generateForTier adds return paths and exit access.
  function generate(width = 12, height = 12, random = Math.random, reserved = new Set(), exit = width * height - 1) {
    const passages = Array.from({ length: width * height }, () => []);
    const seen = new Set([0]);
    const stack = [0];
    while (stack.length) {
      const cell = stack[stack.length - 1];
      const options = neighborsOf(cell, width, height).filter((next) => !seen.has(next) && !reserved.has(next));
      if (!options.length) { stack.pop(); continue; }
      const next = options[Math.floor(random() * options.length)];
      passages[cell].push(next);
      passages[next].push(cell);
      seen.add(next);
      stack.push(next);
    }
    return { width, height, passages, entrance: 0, exit };
  }

  function signature(maze) {
    return maze.passages.map((neighbors) => [...neighbors].sort((a, b) => a - b).join(',')).join(';');
  }

  function createRun(maze) {
    return { maze, position: maze.entrance, trail: [maze.entrance], visited: new Set([maze.entrance]), status: 'playing' };
  }

  function move(run, dx, dy) {
    if (run.status !== 'playing' || Math.abs(dx) + Math.abs(dy) !== 1) return false;
    const { maze } = run;
    const x = run.position % maze.width + dx;
    const y = Math.floor(run.position / maze.width) + dy;
    if (x < 0 || x >= maze.width || y < 0 || y >= maze.height) return false;
    const next = y * maze.width + x;
    if (!maze.passages[run.position].includes(next) || run.visited.has(next)) return false;
    run.position = next;
    run.visited.add(next);
    run.trail.push(next);
    if (next === maze.exit) run.status = 'won';
    else if (maze.passages[next].every((cell) => run.visited.has(cell))) run.status = 'trapped';
    return true;
  }

  const api = { pickTier, measure, shortestRoute, hintCell, matchesTier, generateForTier, generate, signature, createRun, move };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NSG_MAZE = api;
})(typeof window !== 'undefined' ? window : globalThis);
