(function () {
  const IMMUNITY_MS = 8000;
  const SPAWN_GAP_MS = 23000;

  // Compartido por los tres Snake. Sus relojes avanzan solo durante el juego,
  // independientemente de los segundos que puedan robar los bichos.
  function create(grid, occupiedCells) {
    let apple = null;
    let remaining = 0;
    let nextSpawn = 0;
    let immuneUntil = 0;
    let pausedAt = null;
    const now = () => pausedAt === null ? Date.now() : pausedAt;

    function reset(enabled) {
      apple = null;
      immuneUntil = 0;
      pausedAt = null;
      // Entre 1 y 2 manzanas azules por partida, solo en los niveles que las activan.
      remaining = enabled ? 1 + Math.floor(Math.random() * 2) : 0;
      nextSpawn = Date.now() + 5000;
    }

    function update() {
      if (pausedAt !== null || apple || !remaining || now() < nextSpawn) return;
      const occupied = new Set(occupiedCells().map((cell) => `${cell.x},${cell.y}`));
      const free = [];
      for (let y = 0; y < grid; y += 1) {
        for (let x = 0; x < grid; x += 1) {
          if (!occupied.has(`${x},${y}`)) free.push({ x, y });
        }
      }
      if (!free.length) return;
      apple = free[Math.floor(Math.random() * free.length)];
      remaining -= 1;
    }

    function isAt(cell) {
      return Boolean(apple && apple.x === cell.x && apple.y === cell.y);
    }

    function consume(cell) {
      if (pausedAt !== null || !isAt(cell)) return false;
      apple = null;
      immuneUntil = now() + IMMUNITY_MS;
      // La siguiente manzana aparece 23 segundos después de acabar el efecto.
      nextSpawn = immuneUntil + SPAWN_GAP_MS;
      return true;
    }

    function pause() {
      if (pausedAt === null) pausedAt = Date.now();
    }

    function resume() {
      if (pausedAt === null) return;
      const duration = Date.now() - pausedAt;
      nextSpawn += duration;
      if (immuneUntil) immuneUntil += duration;
      pausedAt = null;
    }

    return {
      reset, update, isAt, consume, pause, resume,
      cells: () => apple ? [apple] : [],
      isImmune: () => now() < immuneUntil,
    };
  }

  window.NSG_SNAKE_POWERUPS = { create };
})();
