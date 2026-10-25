(function (root) {
  // Starts at Medium; Medium–Hard extends the laberinto1 progression and shows a hint.
  const tiers = [
    { id: 'medium', weight: 45, size: 18, pathRange: [126, 210], minTurns: 40, minBranches: 12, exitApproaches: 3, minDecoyLength: 24, returnPaths: 5 },
    { id: 'medium-hard', weight: 55, size: 24, pathRange: [170, 300], minTurns: 60, minBranches: 16, exitApproaches: 4, minDecoyLength: 30, returnPaths: 6, hint: true },
  ];

  const config = { gameId: 'laberinto2', tiers };
  if (typeof module !== 'undefined' && module.exports) module.exports = config;
  else root.NSG_MAZE_GAME = { ...config, tiers: root.NSG_MAZE_LEVELS.define(tiers) };
})(typeof window !== 'undefined' ? window : globalThis);
