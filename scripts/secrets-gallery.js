(function () {
  // Pantalla de Secretos: historial de secretos obtenidos, de menor a mayor umbral,
  // en cards de 4 columnas por 3 filas (12 por página) con paginación.
  const PAGE_SIZE = 12;
  const t = (key, vars) => window.NSG_I18N.t(key, vars);
  const grid = document.querySelector('#secrets-grid');
  const empty = document.querySelector('#secrets-empty');
  const count = document.querySelector('#secrets-count');
  const pagination = document.querySelector('#secrets-pagination');
  const previousButton = document.querySelector('#secrets-previous');
  const nextButton = document.querySelector('#secrets-next');
  const pageStatus = document.querySelector('#secrets-page-status');
  const backLink = document.querySelector('#back-link');
  let page = 0;
  let renderToken = 0;

  const obtained = () => (window.NSG_SECRETS ? window.NSG_SECRETS.getObtained() : []);
  const pageCount = (total) => Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageSlice = (items, index) => items.slice(index * PAGE_SIZE, (index + 1) * PAGE_SIZE);

  function makeCard(secret, info) {
    const item = document.createElement('li');
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'secret-card';
    card.dataset.secret = secret.id;
    const number = t('secrets.title', { number: info.number });
    const title = info.title || number;
    card.setAttribute('aria-label', t('secretsPage.cardAria', { number: info.number, title }));
    const label = document.createElement('span');
    label.className = 'secret-card-number';
    label.textContent = number;
    const heading = document.createElement('h2');
    heading.className = 'secret-card-title';
    heading.textContent = title;
    const excerpt = document.createElement('p');
    excerpt.className = 'secret-card-excerpt';
    excerpt.textContent = info.excerpt;
    card.append(label, heading, excerpt);
    card.addEventListener('click', () => window.NSG_SECRETS.openSecret(secret.id));
    item.append(card);
    return item;
  }

  function render() {
    const items = obtained();
    const pages = pageCount(items.length);
    page = Math.min(Math.max(page, 0), pages - 1);
    count.textContent = items.length ? t('secretsPage.count', { count: items.length }) : '';
    empty.hidden = items.length > 0;
    pagination.hidden = pages <= 1;
    previousButton.textContent = `← ${t('menu.previous')}`;
    nextButton.textContent = `${t('menu.next')} →`;
    previousButton.disabled = page === 0;
    nextButton.disabled = page >= pages - 1;
    pageStatus.textContent = `${t('menu.page')} ${page + 1} / ${pages}`;
    const token = ++renderToken;
    grid.setAttribute('aria-busy', 'true');
    return Promise.all(pageSlice(items, page).map((secret) => (
      window.NSG_SECRETS.describe(secret).catch(() => ({
        id: secret.id,
        number: window.NSG_SECRETS._test.numberFor(secret.id),
        title: '',
        excerpt: t('secretsPage.loadError'),
      })).then((info) => makeCard(secret, info))
    ))).then((cards) => {
      if (token !== renderToken) return;
      grid.replaceChildren(...cards);
      grid.removeAttribute('aria-busy');
    });
  }

  function changePage(delta) {
    page += delta;
    render().then(() => {
      // A disabled pagination button cannot keep keyboard focus reliably.
      const pressed = delta > 0 ? nextButton : previousButton;
      if (pressed.disabled) (delta > 0 ? previousButton : nextButton).focus();
    });
  }
  previousButton.addEventListener('click', () => changePage(-1));
  nextButton.addEventListener('click', () => changePage(1));

  // ---------- Navegación completa con teclado ----------
  function navTargets() {
    return Array.from(document.querySelectorAll('#back-link, .secret-card, #secrets-pagination button:not([disabled])'))
      .filter((el) => el.getClientRects().length > 0);
  }

  function focusNearest(current, key) {
    const origin = current.getBoundingClientRect();
    const from = { x: origin.left + origin.width / 2, y: origin.top + origin.height / 2 };
    const direction = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[key];
    let best = null;
    let bestScore = Infinity;
    navTargets().filter((el) => el !== current).forEach((el) => {
      const rect = el.getBoundingClientRect();
      const dx = rect.left + rect.width / 2 - from.x;
      const dy = rect.top + rect.height / 2 - from.y;
      const primary = dx * direction[0] + dy * direction[1];
      if (primary <= 0) return;
      const score = primary + Math.abs(dx * direction[1] - dy * direction[0]) * 2;
      if (score < bestScore) { bestScore = score; best = el; }
    });
    if (best) best.focus();
  }

  document.addEventListener('keydown', (event) => {
    if (window.NSG_SECRETS && window.NSG_SECRETS.isOpen()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      window.location.href = backLink.href;
      return;
    }
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    const active = document.activeElement;
    if (!active || !navTargets().includes(active)) return;
    event.preventDefault();
    focusNearest(active, event.key);
  });

  window.NSG_I18N.applyStaticTranslations(document);
  if (window.NSG_AUDIO && window.NSG_MUSIC) window.NSG_AUDIO.initMenuMusic('../');
  render().then(() => {
    const first = grid.querySelector('.secret-card');
    (first || backLink).focus({ preventScroll: true });
  });

  window.NSG_SECRETS_GALLERY = { PAGE_SIZE, pageCount, pageSlice };
})();
