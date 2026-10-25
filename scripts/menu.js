(function () {
  const TARGET = window.NSG.TARGET_SCORE;
  const scoreCurrentEl = document.querySelector('#score-current');
  const scoreTargetEl = document.querySelector('#score-target');
  const scoreBarEl = document.querySelector('#score-bar');
  const saveBtn = document.querySelector('#save-progress-btn');
  const saveStatusEl = document.querySelector('#save-status');
  const featuredGrid = document.querySelector('#featured-grid');
  const listEl = document.querySelector('#games-list');
  const searchInput = document.querySelector('#games-search');
  const languageSelect = document.querySelector('#language-select');
  const optionsMenu = document.querySelector('#options-menu');
  const musicSelect = document.querySelector('#music-type');
  const pagination = document.querySelector('#games-pagination');
  const previousPage = document.querySelector('#games-previous');
  const nextPage = document.querySelector('#games-next');
  const pageStatus = document.querySelector('#games-page-status');
  const PAGE_SIZE = 5;
  let currentPage = 0;

  function cardDifficulty(game) {
    const value = Number.parseFloat(game.difficulty);
    return Number.isFinite(value) ? value : Infinity;
  }

  function renderPagination(totalPages) {
    const labels = ['menu.pagesLabel', 'menu.previous', 'menu.next', 'menu.page'].map((key) => t(key));
    pagination.hidden = totalPages <= 1;
    pagination.setAttribute('aria-label', labels[0]);
    previousPage.textContent = `← ${labels[1]}`;
    nextPage.textContent = `${labels[2]} →`;
    previousPage.disabled = currentPage === 0;
    nextPage.disabled = currentPage >= totalPages - 1;
    pageStatus.textContent = totalPages ? `${labels[3]} ${currentPage + 1} / ${totalPages}` : '';
  }

  const t = (key, vars) => window.NSG_I18N.t(key, vars);

  function formatNumber(n) {
    const lang = window.NSG_I18N.getLang();
    return Math.round(n).toLocaleString(lang);
  }

  function renderScore() {
    const total = window.NSG.getDisplayTotal();
    scoreCurrentEl.textContent = formatNumber(total);
    scoreTargetEl.textContent = formatNumber(TARGET);
    scoreBarEl.style.width = `${Math.min(100, (total / TARGET) * 100)}%`;
    const pending = window.NSG.hasUnsavedProgress();
    saveStatusEl.textContent = pending ? t('menu.saveStatusPending') : t('menu.saveStatusSaved');
    saveStatusEl.classList.toggle('pending', pending);
    saveBtn.disabled = !pending;
  }

  saveBtn.addEventListener('click', () => {
    window.NSG.commitSave();
    renderScore();
    saveStatusEl.textContent = t('menu.saveStatusJustSaved');
  });

  function shuffle(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function pickRandom(pool, count) {
    return shuffle(pool).slice(0, Math.max(0, count));
  }

  function selectFeatured(games, playedIds, count) {
    const unplayed = games.filter((g) => g.locked || !playedIds.includes(g.id));
    const minUnplayed = Math.min(2, count, unplayed.length);
    const chosenUnplayed = pickRandom(unplayed, minUnplayed);
    const rest = games.filter((g) => !chosenUnplayed.includes(g));
    const chosenRest = pickRandom(rest, count - chosenUnplayed.length);
    return shuffle([...chosenUnplayed, ...chosenRest]);
  }

  // Se cachea para que cambiar de idioma solo retraduzca las cards
  // destacadas, sin volver a sortearlas cada vez.
  let featuredGames = null;

  function localized(game, field) {
    const value = window.NSG_I18N.gameText(game, field);
    return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function illustrationMarkup(game) {
    if (game.illustration === 'maze') {
      return '<svg viewBox="0 0 140 140" width="140" height="140" aria-hidden="true"><path d="M20 35V20H120V120H20V55M40 20V80H80V40H100V100H40M60 40V60M60 100V120" fill="none" stroke="#668c68" stroke-width="7" stroke-linejoin="round"/><circle cx="20" cy="45" r="6" fill="#ce9233"/></svg>';
    }
    if (game.illustration === 'tetra') {
      return '<svg viewBox="0 0 140 140" width="140" height="140" aria-hidden="true"><rect x="50" y="20" width="40" height="20" rx="4" fill="#ce9233"/><rect x="30" y="40" width="40" height="20" rx="4" fill="#d9564d"/><rect x="70" y="40" width="40" height="20" rx="4" fill="#278de0"/><rect x="10" y="60" width="60" height="20" rx="4" fill="#668c68"/><rect x="70" y="60" width="60" height="20" rx="4" fill="#9b6bb5"/><rect x="10" y="80" width="40" height="20" rx="4" fill="#278de0"/><rect x="50" y="80" width="40" height="20" rx="4" fill="#ce9233"/><rect x="90" y="80" width="40" height="20" rx="4" fill="#d9564d"/></svg>';
    }
    if (game.illustration === 'sniper') {
      return '<svg viewBox="0 0 140 140" width="140" height="140" aria-hidden="true"><circle cx="70" cy="70" r="46" fill="#f6f1e4" stroke="#2f3a30" stroke-width="2"/><circle cx="70" cy="70" r="32" fill="#2f3a30"/><circle cx="70" cy="70" r="20" fill="#f6f1e4"/><circle cx="70" cy="70" r="9" fill="#d9564d"/><path d="M70 8V56M70 84V132M8 70H56M84 70H132" stroke="#1b231d" stroke-width="2.5" stroke-linecap="round"/><circle cx="82" cy="62" r="3.5" fill="#10140f" stroke="#fff" stroke-width="1.5"/></svg>';
    }
    if (game.illustration === 'calc') {
      return `
        <div class="illustration-calc" aria-hidden="true">
          <div class="calc-screen"></div>
          <div class="calc-row"><span></span><span></span><span></span><span class="op"></span></div>
          <div class="calc-row"><span></span><span></span><span></span><span class="op"></span></div>
          <div class="calc-row"><span></span><span></span><span></span><span class="op"></span></div>
          <div class="calc-row"><span></span><span class="eq"></span></div>
        </div>`;
    }
    if (game.illustration === 'snake') {
      return `
        <div class="illustration-snake" aria-hidden="true">
          <div class="seg head" style="left:76px; top:30px;"></div>
          <div class="seg" style="left:56px; top:30px;"></div>
          <div class="seg" style="left:56px; top:50px;"></div>
          <div class="seg" style="left:56px; top:70px;"></div>
          <div class="seg" style="left:76px; top:70px;"></div>
          <div class="seg" style="left:96px; top:70px;"></div>
          <div class="apple" style="left:102px; top:32px;"></div>
          <div class="bug" style="left:30px; top:95px;"></div>
          <div class="bug" style="left:110px; top:100px;"></div>
        </div>`;
    }
    return '<div class="illustration-soon" aria-hidden="true">?</div>';
  }

  function difficultyMarkup(game) {
    if (game.difficulty == null) return `<span class="difficulty-label">${t('menu.difficultyUnknown')}</span>`;
    return `<span class="difficulty-label">${t('menu.difficultyLabel', { value: game.difficulty })}</span>`;
  }

  function ctaMarkup(game) {
    return game.locked
      ? `<span class="card-cta locked-cta">${t('menu.comingSoon')}</span>`
      : `<span class="card-cta">${t('menu.play')} <span>→</span></span>`;
  }

  function renderFeatured(games, playedIds) {
    if (!featuredGames) featuredGames = selectFeatured(games, playedIds, 4);
    featuredGrid.innerHTML = featuredGames.map((game) => {
      const tag = game.locked ? 'div' : 'a';
      const hrefAttr = game.locked ? '' : `href="${game.href}"`;
      return `
        <${tag} class="game-card${game.locked ? ' locked' : ''}" ${hrefAttr}>
          <div class="card-illustration">${illustrationMarkup(game)}</div>
          <div class="card-body">
            <h2>${localized(game, 'title')}</h2>
            <p>${localized(game, 'description')}</p>
            <div class="difficulty">${difficultyMarkup(game)}</div>
            ${ctaMarkup(game)}
          </div>
        </${tag}>`;
    }).join('');
  }

  function renderList(games, query) {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = games.filter((game) => {
      if (!normalizedQuery) return true;
      const title = window.NSG_I18N.gameText(game, 'title').toLowerCase();
      const description = window.NSG_I18N.gameText(game, 'description').toLowerCase();
      return title.includes(normalizedQuery) || description.includes(normalizedQuery);
    }).sort((a, b) => cardDifficulty(a) - cardDifficulty(b) || 0);

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    currentPage = Math.max(0, Math.min(currentPage, totalPages - 1));
    renderPagination(totalPages);
    if (!filtered.length) {
      listEl.innerHTML = `<p class="list-empty">${t('menu.noResults')}</p>`;
      return;
    }

    listEl.innerHTML = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE).map((game) => {
      const tag = game.locked ? 'div' : 'a';
      const hrefAttr = game.locked ? '' : `href="${game.href}"`;
      return `
        <${tag} class="list-item${game.locked ? ' locked' : ''}" ${hrefAttr}>
          <div class="list-thumb">${illustrationMarkup(game)}</div>
          <div class="list-body">
            <h3>${localized(game, 'title')}</h3>
            <p>${localized(game, 'description')}</p>
          </div>
          <div class="list-meta">
            ${difficultyMarkup(game)}
            ${ctaMarkup(game)}
          </div>
        </${tag}>`;
    }).join('');
  }

  function renderDynamic() {
    const games = window.NSG_GAMES;
    const playedIds = window.NSG.loadSave().playedGames;
    renderScore();
    renderFeatured(games, playedIds);
    renderList(games, searchInput.value);
  }

  function renderAll() {
    window.NSG_I18N.applyStaticTranslations(document);
    languageSelect.value = window.NSG_I18N.getLang();
    musicSelect.replaceChildren(...Object.entries(window.NSG_MUSIC.types).map(([id, category]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = t(category.labelKey);
      return option;
    }));
    musicSelect.value = window.NSG_AUDIO.getMusicType();
    if (window.NSG_PLAYER) window.NSG_PLAYER.renderBadge();
    renderDynamic();
    window.NSG_MENU_MODES.render();
  }

  languageSelect.addEventListener('change', () => {
    window.NSG_I18N.setLang(languageSelect.value);
    renderAll();
  });
  optionsMenu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && optionsMenu.open) {
      optionsMenu.open = false;
      document.querySelector('#options-title').focus();
    }
  });

  searchInput.addEventListener('input', () => {
    currentPage = 0;
    renderList(window.NSG_GAMES, searchInput.value);
  });
  function changePage(delta) {
    currentPage += delta;
    renderList(window.NSG_GAMES, searchInput.value);
    // A disabled pagination button cannot retain keyboard focus reliably.
    const activeButton = delta > 0 ? nextPage : previousPage;
    if (activeButton.disabled) (delta > 0 ? previousPage : nextPage).focus();
  }
  previousPage.addEventListener('click', () => changePage(-1));
  nextPage.addEventListener('click', () => changePage(1));
  musicSelect.addEventListener('change', () => window.NSG_AUDIO.setMusicType(musicSelect.value));

  // ---------- Navegación completa con teclado ----------
  // Igual que en los overlays de los juegos (botón principal preseleccionado
  // y flechas para cambiar), aquí se puede recorrer todo el menú (idioma,
  // guardar, buscador, cards destacadas y lista) sin tocar el ratón.
  function getNavTargets() {
    return Array.from(document.querySelectorAll(
      '#options-title, #secrets-link, #language-select, #music-type, #random-play-btn, #save-progress-btn:not([disabled]), #sequence-play-btn, #games-search, #games-pagination button:not([disabled]), a.game-card, a.list-item',
    )).filter((el) => el.getClientRects().length > 0 &&
      (optionsMenu.open || !el.closest('.options-content')));
  }

  function focusNearest(current, key) {
    const targets = getNavTargets().filter((el) => el !== current);
    if (!targets.length) return;
    const curRect = current.getBoundingClientRect();
    const curCenter = { x: curRect.left + curRect.width / 2, y: curRect.top + curRect.height / 2 };
    const dirVec = {
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
    }[key];

    let best = null;
    let bestScore = Infinity;
    targets.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      const dx = center.x - curCenter.x;
      const dy = center.y - curCenter.y;
      const primary = dx * dirVec.x + dy * dirVec.y;
      if (primary <= 0) return; // debe quedar en la dirección pulsada
      const perpendicular = Math.abs(dx * dirVec.y - dy * dirVec.x);
      const score = primary + perpendicular * 2;
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    });
    if (best) best.focus();
  }

  document.addEventListener('keydown', (event) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    const active = document.activeElement;
    if (active === musicSelect || active === languageSelect) return; // Native select keyboard controls.
    if (active === searchInput && ['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    if (!active || !getNavTargets().includes(active)) return;
    event.preventDefault();
    focusNearest(active, event.key);
  });

  if (!window.NSG_WELCOME?.active && window.NSG_AUDIO && window.NSG_MUSIC) window.NSG_AUDIO.initMenuMusic('');
  window.addEventListener('nsg:welcome-complete', renderAll);

  window.NSG_MENU_MODES.init({ illustrationMarkup });
  renderAll();

  // Al cargar, deja listo para pulsar el primer juego destacado (lo más
  // parecido a "jugar" que se puede hacer desde el menú), como punto de
  // partida para navegar con el teclado sin tocar el ratón.
  const firstFeatured = featuredGrid.querySelector('a.game-card');
  if (firstFeatured && !window.NSG_WELCOME?.active) firstFeatured.focus();
})();
