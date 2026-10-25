(function () {
  // INTERRUPTOR GLOBAL: poner a false para que desaparezcan todos los mensajes de debug de
  // dificultad de todos los minijuegos (los de nivel variable y los de dificultad fija).
  const ENABLED = true;

  // Una página puede tener un único indicador. Si ningún juego lo crea con `create`, el módulo
  // añade uno de dificultad fija al cargar la página (ver `attachFixed`).
  let claimed = false;

  function build(panel) {
    const indicator = document.createElement('p');
    indicator.className = 'difficulty-debug';
    indicator.setAttribute('role', 'status');
    indicator.hidden = true;
    panel.prepend(indicator);
    return indicator;
  }

  // Contrato común: cada nivel tiene un id estable y un label legible.
  function create(panel, tiers, label = 'Dificultad') {
    claimed = true;
    if (!ENABLED || !panel || !Array.isArray(tiers) || tiers.length < 2) {
      return { setCurrent() {} };
    }
    const indicator = build(panel);

    return {
      setCurrent(tier) {
        if (!tiers.includes(tier) || !tier.id || !tier.label) {
          indicator.hidden = true;
          return;
        }
        indicator.textContent = `DEBUG · ${label}: ${tier.label}`;
        indicator.dataset.difficulty = tier.id;
        indicator.hidden = false;
      },
    };
  }

  // Juegos de dificultad fija: muestran «Fija» sin tocar el script del juego. Basta con cargar
  // este archivo en su página.
  function attachFixed() {
    if (!ENABLED || claimed) return;
    const panel = document.querySelector('.panel');
    if (!panel || panel.querySelector('.difficulty-debug')) return;
    const indicator = build(panel);
    indicator.textContent = 'DEBUG · Dificultad: Fija';
    indicator.dataset.difficulty = 'fixed';
    indicator.hidden = false;
  }

  window.NSG_DIFFICULTY_DEBUG = { create, enabled: ENABLED };
  // Los scripts con `defer` se ejecutan antes de DOMContentLoaded: si el juego llama a `create`, ya habrá reclamado el indicador.
  if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('DOMContentLoaded', attachFixed);
})();
