(function (root) {
  // Provisional calibration: the original 12×12 layout is the Easy reference.
  const tiers = [
    { id: 'very-easy', weight: 5, size: 8, pathRange: [15, 35], minTurns: 5, minBranches: 3, exitApproaches: 2, minDecoyLength: 8, returnPaths: 2 },
    { id: 'easy', weight: 15, size: 12, pathRange: [36, 75], minTurns: 12, minBranches: 5, exitApproaches: 2, minDecoyLength: 12, returnPaths: 3 },
    { id: 'easy-medium', weight: 30, size: 15, pathRange: [76, 125], minTurns: 25, minBranches: 8, exitApproaches: 3, minDecoyLength: 18, returnPaths: 4 },
    { id: 'medium', weight: 50, size: 18, pathRange: [126, 210], minTurns: 40, minBranches: 12, exitApproaches: 3, minDecoyLength: 24, returnPaths: 5 },
  ];

  const config = { gameId: 'laberinto1', tiers };
  if (typeof module !== 'undefined' && module.exports) module.exports = config;
  else root.NSG_MAZE_GAME = { ...config, tiers: root.NSG_MAZE_LEVELS.define(tiers) };
})(typeof window !== 'undefined' ? window : globalThis);
