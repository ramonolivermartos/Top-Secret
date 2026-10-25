// Campo provisional para cambiar la puntuación desde el menú.
// Este archivo es solo para pruebas y depuración: no forma parte de la
// lógica de los juegos ni de los scripts compartidos.
(function () {
  const card = document.querySelector('.progress-card');
  if (!card) return;

  const copy = {
    es: {
      badge: 'DEBUG',
      label: 'Puntos',
      apply: 'Aplicar',
      invalid: 'Introduce un número válido.',
      applied: 'Puntos actualizados. Recargando…',
      unavailable: 'No se pudo acceder al guardado.',
    },
    en: {
      badge: 'DEBUG',
      label: 'Points',
      apply: 'Apply',
      invalid: 'Enter a valid number.',
      applied: 'Points updated. Reloading…',
      unavailable: 'Could not access the save data.',
    },
  };

  const style = document.createElement('style');
  style.textContent = `
    .debug-score-tools {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px dashed #d9ded5;
    }
    .debug-score-badge {
      padding: 3px 6px;
      border-radius: 5px;
      background: #eef4eb;
      color: #668c68;
      font: 700 9px 'DM Mono', monospace;
      letter-spacing: .08em;
    }
    .debug-score-label {
      color: #737b74;
      font-size: 11px;
      font-weight: 600;
    }
    .debug-score-input {
      width: 96px;
      padding: 8px 9px;
      border: 1px solid #dfe4db;
      border-radius: 8px;
      background: #fff;
      color: #202421;
      font: 500 13px 'DM Mono', monospace;
    }
    .debug-score-input:focus {
      outline: 2px solid #668c6855;
      border-color: #668c68;
    }
    .progress-card .debug-score-apply {
      width: auto;
      margin-top: 0;
      padding: 8px 12px;
      font-size: 12px;
    }
    .debug-score-status {
      flex-basis: 100%;
      min-height: 16px;
      margin: 0;
      color: #929991;
      font-size: 11px;
      line-height: 1.4;
    }
    .debug-score-status.is-error { color: #c9574e; }
  `;
  document.head.appendChild(style);

  const tools = document.createElement('div');
  tools.className = 'debug-score-tools';
  tools.innerHTML = `
    <span class="debug-score-badge"></span>
    <label class="debug-score-label" for="debug-score-input"></label>
    <input class="debug-score-input" id="debug-score-input" type="number" min="0" step="1" inputmode="numeric">
    <button class="btn btn-secondary debug-score-apply" id="debug-score-apply" type="button"></button>
    <p class="debug-score-status" id="debug-score-status" role="status"></p>
  `;
  card.appendChild(tools);

  const badge = tools.querySelector('.debug-score-badge');
  const label = tools.querySelector('.debug-score-label');
  const input = tools.querySelector('#debug-score-input');
  const apply = tools.querySelector('#debug-score-apply');
  const status = tools.querySelector('#debug-score-status');

  function text() {
    const lang = window.NSG_I18N && window.NSG_I18N.getLang
      ? window.NSG_I18N.getLang()
      : 'es';
    return copy[lang] || copy.es;
  }

  function renderLabels() {
    const strings = text();
    badge.textContent = strings.badge;
    label.textContent = strings.label;
    apply.textContent = strings.apply;
  }

  function setStatus(message, isError) {
    status.textContent = message || '';
    status.classList.toggle('is-error', Boolean(isError));
  }

  function refreshValue() {
    if (!window.NSG || typeof window.NSG.getDisplayTotal !== 'function') {
      input.disabled = true;
      apply.disabled = true;
      setStatus(text().unavailable, true);
      return;
    }
    input.value = String(Math.round(Number(window.NSG.getDisplayTotal()) || 0));
  }

  function applyValue() {
    if (!window.NSG) return;
    if (!input.value.trim()) {
      setStatus(text().invalid, true);
      input.focus();
      return;
    }
    const target = Math.round(Number(input.value));
    if (!Number.isFinite(target) || target < 0) {
      setStatus(text().invalid, true);
      input.focus();
      return;
    }

    const current = Math.round(Number(window.NSG.getDisplayTotal()) || 0);
    if (typeof window.NSG.applyScoreDelta === 'function') {
      window.NSG.applyScoreDelta(target - current);
    } else {
      const save = window.NSG.loadSave();
      save.totalScore = target;
      localStorage.setItem('nsg_save_v1', JSON.stringify(save));
      sessionStorage.setItem('nsg_pending_v1', '0');
    }
    if (typeof window.NSG.commitSave === 'function') window.NSG.commitSave();

    input.value = String(target);
    setStatus(text().applied, false);
    window.setTimeout(() => window.location.reload(), 60);
  }

  renderLabels();
  refreshValue();
  apply.addEventListener('click', applyValue);
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    applyValue();
  });

  document.querySelectorAll('.lang-btn').forEach((button) => {
    button.addEventListener('click', () => {
      window.setTimeout(renderLabels, 0);
    });
  });
})();
