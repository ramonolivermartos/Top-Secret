(function () {
  // Metadatos compartidos; cada Snake define sus probabilidades y mecánicas.
  const levels = [
    { id: 'very-easy', label: 'Muy fácil' },
    { id: 'easy-medium', label: 'Fácil-medio' },
    { id: 'medium', label: 'Medio' },
    { id: 'medium-hard', label: 'Medio-difícil' },
    { id: 'hard', label: 'Difícil' },
    { id: 'very-hard', label: 'Muy difícil' },
  ];

  window.NSG_SNAKE_DIFFICULTY = {
    define(tiers) {
      return tiers.map((tier, index) => ({ ...levels[index], ...tier }));
    },
  };
})();
