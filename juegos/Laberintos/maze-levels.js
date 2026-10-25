(function (root) {
  // Shared metadata for every maze; each game defines weights and generator bounds.
  const levels = [
    { id: 'very-easy', label: 'Very easy', points: 30 },
    { id: 'easy', label: 'Easy', points: 50 },
    { id: 'easy-medium', label: 'Easy–Medium', points: 90 },
    { id: 'medium', label: 'Medium', points: 140 },
    { id: 'medium-hard', label: 'Medium–Hard', points: 230 },
    { id: 'hard', label: 'Hard', points: 300 },
    { id: 'very-hard', label: 'Very hard', points: 500 },
  ];

  function define(tiers) {
    return tiers.map((tier) => {
      const level = levels.find((entry) => entry.id === tier.id);
      if (!level) throw new Error(`Unknown maze level: ${tier.id}`);
      return { ...level, ...tier };
    });
  }

  const api = { levels, define };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NSG_MAZE_LEVELS = api;
})(typeof window !== 'undefined' ? window : globalThis);
