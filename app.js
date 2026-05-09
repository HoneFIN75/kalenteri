/**
 * Kilpailukalenterijärjestelmä – Prototyyppi
 * Roolivalinta ja uutisnäkymät etusivulle
 *
 * Roolit (ei kirjautumista):
 *   admin, liitto, kilpailujohtaja, kilpailija, katsoja
 *
 * Valittu rooli tallennetaan sessionStorageen. Uutiset haetaan/tallennetaan
 * PHP-API:n kautta MySQL:ään ja tykkäysten roolikohtainen tila localStorageen.
 */

const ROLES = [
  {
    id: 'admin',
    name: 'Admin',
    icon: '🛡️',
    description: 'Järjestelmän ylläpito ja hallinta',
  },
  {
    id: 'liitto',
    name: 'Liitto',
    icon: '🏛️',
    description: 'Liiton edustaja, kilpailukalenterin hyväksyminen',
  },
  {
    id: 'kilpailujohtaja',
    name: 'Kilpailunjohtaja',
    icon: '📋',
    description: 'Kilpailun organisointi ja hallinta',
  },
  {
    id: 'kilpailija',
    name: 'Kilpailija',
    icon: '🏅',
    description: 'Kilpailijan ilmoittautuminen ja tulokset',
  },
  {
    id: 'katsoja',
    name: 'Katsoja',
    icon: '👁️',
    description: 'Kilpailukalenterin selaus ilman kirjautumista',
  },
];

const SECTION_CONFIG = {
  admin: {
    title: 'Admin-uutiset',
    buttonId: 'add-admin-news-button',
    listId: 'admin-news-list',
    createLabel: 'Lisää admin uutinen',
    editLabel: 'Muokkaa admin uutista',
  },
  liitto: {
    title: 'Liitto-uutiset',
    buttonId: 'add-liitto-news-button',
    listId: 'liitto-news-list',
    createLabel: 'Lisää liitto uutinen',
    editLabel: 'Muokkaa liitto uutista',
  },
};

const NEWS_LIKES_STORAGE_KEY = 'kalenteriNewsLikes';
const NEWS_API_URL = 'api/news.php';
const DB_TEST_API_URL = 'api/db-test.php';
const COMPETITION_CLASS_FILTER_STORAGE_KEY = 'kalenteriCompetitionClassFilter';
const COMPETITION_PDGA_TIER_FILTER_STORAGE_KEY = 'kalenteriCompetitionPdgaTierFilter';
const COMPETITION_ORGANIZER_FILTER_STORAGE_KEY = 'kalenteriCompetitionOrganizerFilter';
const COMPETITION_TYPE_FILTER_STORAGE_KEY = 'kalenteriCompetitionTypeFilter';
const COMPETITION_DIVISION_ORDER = ['MPO', 'FPO', 'MP40', 'FP40', 'MP50', 'FP50', 'MP55', 'FP55', 'MP60', 'FP60', 'MP65', 'FP65', 'MP70', 'FP70', 'MP75', 'FP75', 'MP80', 'FP80'];
const DEFAULT_FINLAND_CENTER_COORDINATES = [64.5, 26.0];
const FINLAND_BOUNDS = [[59.2, 18.5], [70.5, 32.5]];
const MAP_COORDINATE_KEY_PRECISION = 4;
const MAP_OVERLAP_OFFSET_RADIUS = 0.03;
const MAP_OVERLAP_OFFSET_ANGLE_STEP = 1.2;
const MAP_FIT_BOUNDS_MAX_ZOOM = 9;
const MUNICIPALITY_COORDINATES = {
  helsinki: [60.1699, 24.9384],
  espoo: [60.2055, 24.6559],
  vantaa: [60.2934, 25.0378],
  kauniainen: [60.2116, 24.7284],
  turku: [60.4518, 22.2666],
  tampere: [61.4981, 23.7608],
  oulu: [65.0121, 25.4651],
  jyvaskyla: [62.2426, 25.7473],
  kuopio: [62.8924, 27.677],
  lahti: [60.9827, 25.6615],
  pori: [61.4851, 21.7974],
  vaasa: [63.0951, 21.6165],
  joensuu: [62.601, 29.7636],
  lappeenranta: [61.0583, 28.1887],
  raahe: [64.6839, 24.4817],
  rovaniemi: [66.5039, 25.7294],
  kajaani: [64.227, 27.7285],
  kotka: [60.4674, 26.9458],
  kouvola: [60.8679, 26.7042],
  savonlinna: [61.868, 28.8862],
  seinajoki: [62.7945, 22.8282],
  harjavalta: [61.3168, 22.1373],
  nokia: [61.4786, 23.5056],
  hyvinkaa: [60.6337, 24.8631],
  jarvenpaa: [60.4737, 25.0899],
  kerava: [60.4034, 25.105],
  lohja: [60.2487, 24.0657],
  porvoo: [60.3932, 25.665],
  salo: [60.3833, 23.1333],
  raisio: [60.4869, 22.1683],
  naantali: [60.4667, 22.0333],
  rauma: [61.1308, 21.5111],
  kankaanpaa: [61.8059, 22.3966],
  mikkeli: [61.6886, 27.2723],
  heinola: [61.203, 26.035],
  hameenlinna: [60.9967, 24.4643],
  riihimaki: [60.7378, 24.7773],
  nakkila: [61.3663, 22.0045],
  ylivieska: [64.0736, 24.5458],
  imatra: [61.1719, 28.77],
  mariehamn: [60.0973, 19.9348],
  maarianhamina: [60.0973, 19.9348],
  ahvenanmaa: [60.1785, 20.0],
  aland: [60.1785, 20.0],
  jomala: [60.1525, 19.9494],
  lemland: [60.07, 20.08],
  finstrom: [60.23, 19.9],
  sund: [60.24, 20.1],
  saltvik: [60.28, 20.07],
};

/**
 * PDGA-tasojen visuaalinen määrittely: väri, ikoni ja näyttönimi.
 * Avain on pienillä kirjaimilla normalisoitu tieto.
 */
const PDGA_TIER_MAP = {
  major:  { color: '#92400e', icon: '◆', label: 'Major' },
  nt:     { color: '#1e3a8a', icon: '★', label: 'NT' },
  es:     { color: '#6d28d9', icon: '▲', label: 'ES' },
  'a-tier': { color: '#1a56db', icon: '●', label: 'A-tier' },
  'b-tier': { color: '#047857', icon: '■', label: 'B-tier' },
  'c-tier': { color: '#b45309', icon: '▬', label: 'C-tier' },
  xc:     { color: '#6b7280', icon: '–',  label: 'XC' },
};

/** Palauttaa PDGA-tason visuaalisen tiedon tai oletuksen tuntemattomille tasoille. */
function normalizePdgaTierKey(tier) {
  return (tier || '').trim().toLowerCase();
}

/** Palauttaa PDGA-tason visuaalisen tiedon tai oletuksen tuntemattomille tasoille. */
function getPdgaTierStyle(tier) {
  const key = normalizePdgaTierKey(tier);
  return PDGA_TIER_MAP[key] || { color: '#1a56db', icon: '●', label: tier || '' };
}

/** Palauttaa PDGA-tason badge-HTML:n. */
function pdgaTierBadgeHtml(tier) {
  if (!tier) return '';
  const { color, icon, label } = getPdgaTierStyle(tier);
  // Sallitaan vain turvallinen hex-värimuoto inline-tyylissä.
  const safeColor = /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : '#1a56db';
  return `<span class="pdga-tier-badge" style="--tier-color:${safeColor}" aria-label="PDGA-taso: ${escapeHtml(label)}">`
    + `<span class="pdga-tier-badge__icon" aria-hidden="true">${icon}</span>`
    + `<span class="pdga-tier-badge__label">${escapeHtml(label)}</span>`
    + `</span>`;
}

let cachedNewsItems = [];
const competitionCalendarState = {
  calendar: null,
  map: null,
  mapMarkersLayer: null,
  mapRangeStart: null,
  mapRangeEnd: null,
  events: [],
  availableDivisions: [],
  availablePdgaTiers: [],
  availableOrganizers: [],
  availableCompetitionTypes: [],
  lastFilterKey: '',
};

/** Palauttaa tällä hetkellä valitun roolin sessionStoragesta. */
function getSelectedRole() {
  const roleId = sessionStorage.getItem('selectedRole');
  return ROLES.some((role) => role.id === roleId) ? roleId : null;
}

/** Tallentaa valitun roolin ja päivittää käyttöliittymän. */
function selectRole(roleId) {
  sessionStorage.setItem('selectedRole', roleId);
  closeEditor();
  renderApp();
}

/** Hakee roolin näyttönimen tunnisteen perusteella. */
function getRoleName(roleId) {
  const role = ROLES.find((item) => item.id === roleId);
  return role ? role.name : roleId;
}

/** Luo yksilöllisen tunnisteen uutiselle. */
function createNewsId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }

  return `news-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Muotoilee aikaleiman muotoon pvm.kk.vuosi tunti:min. */
function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

/** Palauttaa hash-reitiltä uutistunnisteen, jos yksittäinen uutinen on auki. */
function getRouteNewsId() {
  const hash = window.location.hash || '#news';
  if (!hash.startsWith('#news/')) {
    return null;
  }

  return decodeURIComponent(hash.slice('#news/'.length));
}

/** Lukee uutiset välimuistista. */
function loadNews() {
  return cachedNewsItems;
}

/** Hakee uutiset API:sta ja päivittää välimuistin. */
async function fetchNewsFromApi() {
  const response = await fetch(NEWS_API_URL, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Uutisten haku epäonnistui.');
  }

  const parsed = await response.json();
  if (!Array.isArray(parsed)) {
    cachedNewsItems = [];
    return;
  }

  cachedNewsItems = parsed
    .map((item) => normalizeNews(item))
    .filter(Boolean);
}

/** Tallentaa tai päivittää yhden uutisen API:n kautta. */
async function saveNewsItem(newsItem) {
  const response = await fetch(NEWS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(newsItem),
  });

  if (!response.ok) {
    throw new Error('Uutisen tallennus epäonnistui.');
  }
}

/** Poistaa uutisen API:n kautta. */
async function deleteNewsItem(newsId) {
  const response = await fetch(`${NEWS_API_URL}?id=${encodeURIComponent(newsId)}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Uutisen poisto epäonnistui.');
  }
}

/** Testaa tietokantayhteyden API:n kautta ja näyttää tuloksen käyttäjälle. */
async function testDatabaseConnection() {
  try {
    const response = await fetch(DB_TEST_API_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok && data.ok) {
      window.alert(data.message || 'Tietokantayhteys toimii.');
    } else {
      window.alert(`Virhe: ${data.error || 'Tietokantayhteys epäonnistui.'}`);
    }
  } catch (error) {
    window.alert('Tietokantayhteyden testaus epäonnistui. Tarkista verkko ja yritä uudelleen.');
  }
}

/** Lukee tykkäystiedot localStoragesta. */
function loadNewsLikes() {
  try {
    const rawValue = localStorage.getItem(NEWS_LIKES_STORAGE_KEY);
    const parsed = rawValue ? JSON.parse(rawValue) : {};

    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
}

/** Tallentaa tykkäystiedot localStorageen. */
function saveNewsLikes(likesByRole) {
  localStorage.setItem(NEWS_LIKES_STORAGE_KEY, JSON.stringify(likesByRole));
}

/** Lukee merkkijonoarvoisen kilpailukalenterisuodattimen sessionStoragesta. */
function loadCompetitionArrayFilter(storageKey) {
  try {
    const rawValue = sessionStorage.getItem(storageKey);
    const parsed = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : [];
  } catch (error) {
    return [];
  }
}

/** Tallentaa merkkijonoarvoisen kilpailukalenterisuodattimen sessionStorageen. */
function saveCompetitionArrayFilter(storageKey, selectedValues) {
  sessionStorage.setItem(storageKey, JSON.stringify(selectedValues));
}

/** Lukee kilpailukalenterin luokkasuodattimen sessionStoragesta. */
function loadCompetitionClassFilter() {
  return loadCompetitionArrayFilter(COMPETITION_CLASS_FILTER_STORAGE_KEY);
}

/** Tallentaa kilpailukalenterin luokkasuodattimen sessionStorageen. */
function saveCompetitionClassFilter(selectedDivisions) {
  saveCompetitionArrayFilter(COMPETITION_CLASS_FILTER_STORAGE_KEY, selectedDivisions);
}

/** Normalisoi yksittäisen uutisolion turvalliseen muotoon. */
function normalizeNews(item) {
  if (!item || typeof item !== 'object') {
    return null;
  }

  let section = null;
  if (item.section === 'admin' || item.section === 'liitto') {
    section = item.section;
  }
  if (!section) {
    return null;
  }

  const validRoleIds = new Set(ROLES.map((role) => role.id));
  const rawVisibleRoles = Array.isArray(item.visibleRoles) ? item.visibleRoles : [];
  const filteredVisibleRoles = rawVisibleRoles.filter(
    (roleId) => validRoleIds.has(roleId) && roleId !== section,
  );
  const visibleRoles = [...new Set(filteredVisibleRoles)];

  return {
    id: typeof item.id === 'string' && item.id ? item.id : createNewsId(),
    section,
    title: typeof item.title === 'string' ? item.title.trim() : '',
    content: typeof item.content === 'string' ? item.content.trim() : '',
    visibleRoles,
    publishedAt: item.publishedAt || new Date().toISOString(),
    likesCount: Number.isFinite(item.likesCount) ? Math.max(0, item.likesCount) : 0,
  };
}

/** Palauttaa uutiset järjestettynä uusimmasta vanhimpaan. */
function sortNewsByPublishedAt(newsItems) {
  return [...newsItems].sort((left, right) => new Date(right.publishedAt) - new Date(left.publishedAt));
}

/** Tarkistaa, voiko rooli hallita uutisosiota. */
function canManageSection(section, roleId) {
  return roleId === section && (section === 'admin' || section === 'liitto');
}

/** Tarkistaa, näkeekö rooli uutisen. */
function isNewsVisibleToRole(newsItem, roleId) {
  if (!roleId) {
    return false;
  }

  if (roleId === newsItem.section) {
    return true;
  }

  return newsItem.visibleRoles.includes(roleId);
}

/** Tarkistaa, onko valittu rooli tykännyt uutisesta. */
function hasRoleLikedNews(newsId, roleId) {
  if (!roleId) {
    return false;
  }

  const likesByRole = loadNewsLikes();
  const likedNewsIds = Array.isArray(likesByRole[roleId]) ? likesByRole[roleId] : [];
  return likedNewsIds.includes(newsId);
}

/** Rakentaa roolikortit DOM:iin. */
function buildRoleCards() {
  const grid = document.getElementById('role-grid');
  grid.innerHTML = '';

  ROLES.forEach((role) => {
    const card = document.createElement('button');
    card.className = 'role-card';
    card.type = 'button';
    card.dataset.roleId = role.id;
    card.setAttribute('aria-pressed', 'false');
    card.setAttribute('title', `Valitse rooli: ${role.name}`);
    card.innerHTML = `
      <span class="role-icon" aria-hidden="true">${role.icon}</span>
      <div class="role-name">${role.name}</div>
      <div class="role-desc">${role.description}</div>
    `;
    card.addEventListener('click', () => selectRole(role.id));
    grid.appendChild(card);
  });
}

/** Päivittää valitun roolin bannerin ja roolikorttien tilan. */
function renderRoleSelection() {
  const selectedId = getSelectedRole();

  document.querySelectorAll('.role-card').forEach((card) => {
    const isSelected = card.dataset.roleId === selectedId;
    card.classList.toggle('selected', isSelected);
    card.setAttribute('aria-pressed', String(isSelected));
  });

  const banner = document.getElementById('selected-banner');
  if (selectedId) {
    const role = ROLES.find((item) => item.id === selectedId);
    document.getElementById('banner-icon').textContent = role.icon;
    document.getElementById('banner-role').textContent = role.name;
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

/** Luo perusviestin uutislistaan. */
function createListMessage(message, accentClass = '') {
  const paragraph = document.createElement('p');
  paragraph.className = `list-message ${accentClass}`.trim();
  paragraph.textContent = message;
  return paragraph;
}

/** Luo tagit näkyville rooleille. */
function buildVisibilityTags(newsItem) {
  const roles = [...new Set([newsItem.section, ...newsItem.visibleRoles])];
  const tagList = document.createElement('ul');
  tagList.className = 'tag-list';

  roles.forEach((roleId) => {
    const item = document.createElement('li');
    item.className = 'tag';
    item.textContent = getRoleName(roleId);
    tagList.appendChild(item);
  });

  return tagList;
}

/** Luo uutiskortin listanäkymään. */
function buildNewsCard(newsItem) {
  const article = document.createElement('article');
  article.className = 'news-card';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'news-card-button';
  button.setAttribute('aria-label', `Avaa uutinen: ${newsItem.title}`);
  button.addEventListener('click', () => {
    closeEditor();
    window.location.hash = `#news/${encodeURIComponent(newsItem.id)}`;
  });

  const title = document.createElement('h3');
  title.className = 'news-card-title';
  title.textContent = newsItem.title;

  const timestamp = document.createElement('p');
  timestamp.className = 'news-card-timestamp';
  timestamp.textContent = formatDateTime(newsItem.publishedAt);

  const meta = document.createElement('div');
  meta.className = 'news-card-meta';

  const likes = document.createElement('span');
  likes.className = 'news-like-count';
  likes.textContent = `Tykkäykset: ${newsItem.likesCount}`;

  meta.append(buildVisibilityTags(newsItem), likes);
  button.append(title, timestamp, meta);
  article.appendChild(button);

  return article;
}

/** Päivittää yksittäisen uutislistan sisällön. */
function renderNewsList(section, roleId, allNews) {
  const config = SECTION_CONFIG[section];
  const container = document.getElementById(config.listId);
  const addButton = document.getElementById(config.buttonId);

  addButton.hidden = !canManageSection(section, roleId);
  addButton.onclick = () => openEditor(section);

  if (section === 'admin') {
    const dbTestButton = document.getElementById('db-test-button');
    dbTestButton.hidden = roleId !== 'admin';
  }

  container.innerHTML = '';

  if (!roleId) {
    container.appendChild(createListMessage('Valitse ensin rooli nähdäksesi uutiset.', 'list-message--muted'));
    return;
  }

  const visibleNews = sortNewsByPublishedAt(
    allNews.filter((newsItem) => newsItem.section === section && isNewsVisibleToRole(newsItem, roleId)),
  );

  if (!visibleNews.length) {
    const message = canManageSection(section, roleId)
      ? 'Ei uutisia vielä. Luo ensimmäinen uutinen tämän osion painikkeesta.'
      : 'Tässä osiossa ei ole tällä hetkellä sinulle näkyviä uutisia.';
    container.appendChild(createListMessage(message));
    return;
  }

  visibleNews.forEach((newsItem) => {
    container.appendChild(buildNewsCard(newsItem));
  });
}

/** Piirtää molemmat uutislistat valitun roolin mukaan. */
function renderNewsLists() {
  const selectedRole = getSelectedRole();
  const newsItems = loadNews();

  renderNewsList('admin', selectedRole, newsItems);
  renderNewsList('liitto', selectedRole, newsItems);
}

/** Luo toimintopainikkeen. */
function buildActionButton(label, className, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

/** Piirtää yksittäisen uutisen näkymän. */
function renderNewsDetail() {
  const detailView = document.getElementById('news-detail-view');
  const listView = document.getElementById('news-lists-view');
  const newsId = getRouteNewsId();

  if (!newsId) {
    detailView.classList.add('hidden');
    listView.classList.remove('hidden');
    detailView.innerHTML = '';
    return;
  }

  detailView.classList.remove('hidden');
  listView.classList.add('hidden');
  detailView.innerHTML = '';

  const selectedRole = getSelectedRole();
  const newsItem = loadNews().find((item) => item.id === newsId);
  const backButton = buildActionButton('← Takaisin uutislistaan', 'secondary-button', () => {
    window.location.hash = '#news';
  });

  detailView.appendChild(backButton);

  if (!newsItem || !isNewsVisibleToRole(newsItem, selectedRole)) {
    detailView.appendChild(createListMessage('Uutista ei löytynyt tai sinulla ei ole siihen näkyvyyttä.'));
    return;
  }

  const article = document.createElement('article');
  article.className = 'news-detail-card';

  const heading = document.createElement('h2');
  heading.className = 'news-detail-title';
  heading.textContent = newsItem.title;

  const timestamp = document.createElement('p');
  timestamp.className = 'news-detail-timestamp';
  timestamp.textContent = formatDateTime(newsItem.publishedAt);

  const body = document.createElement('div');
  body.className = 'news-detail-body';
  body.textContent = newsItem.content;

  const footer = document.createElement('div');
  footer.className = 'news-detail-footer';

  const leftMeta = document.createElement('div');
  leftMeta.className = 'news-detail-meta';

  const audienceLabel = document.createElement('p');
  audienceLabel.className = 'news-detail-label';
  audienceLabel.textContent = 'Näkyy rooleille';

  leftMeta.append(audienceLabel, buildVisibilityTags(newsItem));

  const actions = document.createElement('div');
  actions.className = 'news-detail-actions';

  const liked = hasRoleLikedNews(newsItem.id, selectedRole);
  const likeLabel = liked ? 'Poista tykkäys' : 'Tykkää';
  actions.appendChild(
    buildActionButton(`${likeLabel} (${newsItem.likesCount})`, 'primary-button', () => {
      toggleNewsLike(newsItem.id);
    }),
  );

  if (canManageSection(newsItem.section, selectedRole)) {
    actions.appendChild(
      buildActionButton('Muokkaa', 'secondary-button', () => {
        window.location.hash = '#news';
        openEditor(newsItem.section, newsItem.id);
      }),
    );

    actions.appendChild(
      buildActionButton('Poista', 'danger-button', () => {
        deleteNews(newsItem.id);
      }),
    );
  }

  footer.append(leftMeta, actions);
  article.append(heading, timestamp, body, footer);
  detailView.appendChild(article);
}

/** Avaa uutislomakkeen luontia tai muokkausta varten. */
function openEditor(section, newsId = '') {
  const selectedRole = getSelectedRole();
  if (!canManageSection(section, selectedRole)) {
    return;
  }

  const editor = document.getElementById('news-editor');
  const form = document.getElementById('news-form');
  const titleInput = document.getElementById('news-title');
  const contentInput = document.getElementById('news-content');
  const idInput = document.getElementById('news-id');
  const sectionInput = document.getElementById('news-section');
  const heading = document.getElementById('news-editor-heading');
  const saveButton = document.getElementById('save-news-button');

  const newsItem = newsId ? loadNews().find((item) => item.id === newsId) : null;
  if (newsId && (!newsItem || newsItem.section !== section)) {
    return;
  }

  form.reset();
  idInput.value = newsItem ? newsItem.id : '';
  sectionInput.value = section;
  titleInput.value = newsItem ? newsItem.title : '';
  contentInput.value = newsItem ? newsItem.content : '';

  buildVisibilityOptions(section, newsItem ? [section, ...newsItem.visibleRoles] : [section]);

  heading.textContent = newsItem ? SECTION_CONFIG[section].editLabel : SECTION_CONFIG[section].createLabel;
  saveButton.textContent = newsItem ? 'Tallenna muutokset' : 'Julkaise uutinen';
  editor.classList.remove('hidden');

  editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
  titleInput.focus();
}

/** Sulkee uutislomakkeen. */
function closeEditor() {
  const editor = document.getElementById('news-editor');
  const form = document.getElementById('news-form');
  form.reset();
  editor.classList.add('hidden');
}

/** Rakentaa näkyvyysvalinnat uutislomakkeeseen. */
function buildVisibilityOptions(section, selectedRoles) {
  const container = document.getElementById('visible-roles-options');
  container.innerHTML = '';

  ROLES.forEach((role) => {
    const label = document.createElement('label');
    label.className = 'checkbox-option';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = 'visibleRoles';
    input.value = role.id;

    const isOwnerRole = role.id === section;
    input.checked = isOwnerRole || selectedRoles.includes(role.id);
    input.disabled = isOwnerRole;

    const text = document.createElement('span');
    text.textContent = role.name;

    label.append(input, text);
    container.appendChild(label);
  });
}

/** Käsittelee uutislomakkeen tallennuksen. */
async function handleNewsSubmit(event) {
  event.preventDefault();

  const selectedRole = getSelectedRole();
  const newsId = document.getElementById('news-id').value;
  const section = document.getElementById('news-section').value;
  const title = document.getElementById('news-title').value.trim();
  const content = document.getElementById('news-content').value.trim();

  if (!canManageSection(section, selectedRole)) {
    closeEditor();
    renderApp();
    return;
  }

  if (!title || !content) {
    window.alert('Uutinen tarvitsee otsikon ja sisällön.');
    return;
  }

  const visibleRoles = Array.from(
    document.querySelectorAll('#visible-roles-options input[type="checkbox"]:checked'),
  )
    .map((input) => input.value)
    .filter((roleId) => roleId !== section);

  const newsItems = loadNews();
  let newsToSave = null;

  if (newsId) {
    const newsItem = newsItems.find((item) => item.id === newsId);
    if (!newsItem || newsItem.section !== section) {
      closeEditor();
      renderApp();
      return;
    }

    newsToSave = {
      ...newsItem,
      title,
      content,
      visibleRoles,
    };
  } else {
    newsToSave = {
      id: createNewsId(),
      section,
      title,
      content,
      visibleRoles,
      publishedAt: new Date().toISOString(),
      likesCount: 0,
    };
  }

  try {
    await saveNewsItem(newsToSave);
    await fetchNewsFromApi();
    closeEditor();
    renderApp();
  } catch (error) {
    window.alert('Uutisen tallennus epäonnistui. Yritä uudelleen.');
  }
}

/** Poistaa uutisen ja siihen liittyvät tykkäysmerkinnät. */
async function deleteNews(newsId) {
  const selectedRole = getSelectedRole();
  const newsItems = loadNews();
  const newsItem = newsItems.find((item) => item.id === newsId);

  if (!newsItem || !canManageSection(newsItem.section, selectedRole)) {
    return;
  }

  if (!window.confirm('Haluatko varmasti poistaa uutisen?')) {
    return;
  }

  try {
    await deleteNewsItem(newsId);
    await fetchNewsFromApi();

    const likesByRole = loadNewsLikes();
    Object.keys(likesByRole).forEach((roleId) => {
      const likedNewsIds = Array.isArray(likesByRole[roleId]) ? likesByRole[roleId] : [];
      likesByRole[roleId] = likedNewsIds.filter((likedNewsId) => likedNewsId !== newsId);
    });
    saveNewsLikes(likesByRole);

    window.location.hash = '#news';
    closeEditor();
    renderApp();
  } catch (error) {
    window.alert('Uutisen poisto epäonnistui. Yritä uudelleen.');
  }
}

/** Lisää tai poistaa tykkäyksen valitulta roolilta. */
async function toggleNewsLike(newsId) {
  const selectedRole = getSelectedRole();
  if (!selectedRole) {
    return;
  }

  const newsItems = loadNews();
  const newsIndex = newsItems.findIndex((item) => item.id === newsId);

  if (newsIndex === -1 || !isNewsVisibleToRole(newsItems[newsIndex], selectedRole)) {
    return;
  }

  const likesByRole = loadNewsLikes();
  const likedNewsIds = new Set(Array.isArray(likesByRole[selectedRole]) ? likesByRole[selectedRole] : []);

  if (likedNewsIds.has(newsId)) {
    likedNewsIds.delete(newsId);
    newsItems[newsIndex].likesCount = Math.max(0, newsItems[newsIndex].likesCount - 1);
  } else {
    likedNewsIds.add(newsId);
    newsItems[newsIndex].likesCount += 1;
  }

  likesByRole[selectedRole] = [...likedNewsIds];

  try {
    await saveNewsItem(newsItems[newsIndex]);
    saveNewsLikes(likesByRole);
    await fetchNewsFromApi();
    renderApp();
  } catch (error) {
    window.alert('Tykkäyksen tallennus epäonnistui. Yritä uudelleen.');
  }
}

/** Päivittää koko käyttöliittymän nykyisen tilan mukaan. */
function renderApp() {
  renderRoleSelection();
  renderNewsLists();
  renderNewsDetail();
  renderCompetitionCalendarLegend();
  renderCompetitionCalendarFilter();
}

/** Alustaa staattiset kuuntelijat. */
function bindEventListeners() {
  document.getElementById('news-form').addEventListener('submit', handleNewsSubmit);
  document.getElementById('cancel-news-button').addEventListener('click', closeEditor);
  document.getElementById('db-test-button').addEventListener('click', testDatabaseConnection);
  window.addEventListener('hashchange', async () => {
    try {
      await fetchNewsFromApi();
    } catch (error) {
      // Jos haku epäonnistuu, näytetään viimeisin välimuisti.
    }
    renderApp();
  });
}

/** Alustaa sovelluksen sivun latautuessa. */
document.addEventListener('DOMContentLoaded', async () => {
  if (!window.location.hash) {
    window.location.hash = '#news';
  }

  buildRoleCards();
  bindEventListeners();
  try {
    await fetchNewsFromApi();
  } catch (error) {
    // Jos haku epäonnistuu, näytetään tyhjä listaus.
  }
  renderApp();
  initCompetitionCalendar();
});

/* ============================================================
   Kilpailukalenteri – FullCalendar-integraatio
   ============================================================ */

const COMPETITIONS_API_URL = 'api/competitions.php';

/** Palauttaa kilpailukalenterin uniikit tekstiarvot aakkosjärjestyksessä. */
function getAvailableCompetitionValues(events, accessor) {
  const valueSet = new Set();

  events.forEach((eventItem) => {
    const rawValue = accessor(eventItem);
    if (typeof rawValue !== 'string') {
      return;
    }

    const value = rawValue.trim();
    if (value) {
      valueSet.add(value);
    }
  });

  return [...valueSet].sort((left, right) => left.localeCompare(right, 'fi'));
}

/** Palauttaa kilpailukalenterin saatavilla olevat luokat vakaassa järjestyksessä. */
function getAvailableCompetitionDivisions(events) {
  const divisionSet = new Set();

  events.forEach((eventItem) => {
    const divisions = Array.isArray(eventItem?.extendedProps?.divisions) ? eventItem.extendedProps.divisions : [];
    divisions.forEach((division) => {
      if (typeof division === 'string' && division) {
        divisionSet.add(division);
      }
    });
  });

  return [...divisionSet].sort((left, right) => {
    const leftIndex = COMPETITION_DIVISION_ORDER.indexOf(left);
    const rightIndex = COMPETITION_DIVISION_ORDER.indexOf(right);

    if (leftIndex === -1 && rightIndex === -1) {
      return left.localeCompare(right, 'fi');
    }
    if (leftIndex === -1) {
      return 1;
    }
    if (rightIndex === -1) {
      return -1;
    }
    return leftIndex - rightIndex;
  });
}

/** Palauttaa kilpailukalenterin saatavilla olevat PDGA-tasot vakaassa järjestyksessä. */
function getAvailableCompetitionPdgaTiers(events) {
  const tierSet = new Set();
  const tierOrder = Object.keys(PDGA_TIER_MAP);

  events.forEach((eventItem) => {
    const tierKey = normalizePdgaTierKey(eventItem?.extendedProps?.pdgatier);
    if (tierKey) {
      tierSet.add(tierKey);
    }
  });

  return [...tierSet].sort((left, right) => {
    const leftIndex = tierOrder.indexOf(left);
    const rightIndex = tierOrder.indexOf(right);

    if (leftIndex === -1 && rightIndex === -1) {
      return getPdgaTierStyle(left).label.localeCompare(getPdgaTierStyle(right).label, 'fi');
    }
    if (leftIndex === -1) {
      return 1;
    }
    if (rightIndex === -1) {
      return -1;
    }
    return leftIndex - rightIndex;
  });
}

/** Suodattaa tallennetut arvot vain saatavilla oleviin arvoihin. */
function sanitizeCompetitionFilterSelection(selectedValues, availableValues) {
  const selectedSet = new Set(
    selectedValues.filter((value) => typeof value === 'string'),
  );

  return availableValues.filter((value) => selectedSet.has(value));
}

/** Suodattaa tallennetut luokat vain saatavilla oleviin arvoihin. */
function sanitizeCompetitionClassFilter(selectedDivisions, availableDivisions) {
  return sanitizeCompetitionFilterSelection(selectedDivisions, availableDivisions);
}

/** Palauttaa aktiivisen kilpailukalenterin luokkasuodattimen. */
function getCompetitionClassFilterSelection() {
  return sanitizeCompetitionClassFilter(loadCompetitionClassFilter(), competitionCalendarState.availableDivisions);
}

/** Lukee kilpailukalenterin aktiivisen PDGA-tasosuodattimen. */
function getCompetitionPdgaTierFilterSelection() {
  return sanitizeCompetitionFilterSelection(
    loadCompetitionArrayFilter(COMPETITION_PDGA_TIER_FILTER_STORAGE_KEY),
    competitionCalendarState.availablePdgaTiers,
  );
}

/** Tallentaa kilpailukalenterin aktiivisen PDGA-tasosuodattimen. */
function setCompetitionPdgaTierFilter(selectedPdgaTiers) {
  const sanitized = sanitizeCompetitionFilterSelection(
    selectedPdgaTiers,
    competitionCalendarState.availablePdgaTiers,
  );
  saveCompetitionArrayFilter(COMPETITION_PDGA_TIER_FILTER_STORAGE_KEY, sanitized);
  renderCompetitionCalendarFilter();
}

/** Lukee kilpailukalenterin aktiivisen järjestäjäsuodattimen. */
function getCompetitionOrganizerFilterSelection() {
  return sanitizeCompetitionFilterSelection(
    loadCompetitionArrayFilter(COMPETITION_ORGANIZER_FILTER_STORAGE_KEY),
    competitionCalendarState.availableOrganizers,
  );
}

/** Tallentaa kilpailukalenterin aktiivisen järjestäjäsuodattimen. */
function setCompetitionOrganizerFilter(selectedOrganizers) {
  const sanitized = sanitizeCompetitionFilterSelection(
    selectedOrganizers,
    competitionCalendarState.availableOrganizers,
  );
  saveCompetitionArrayFilter(COMPETITION_ORGANIZER_FILTER_STORAGE_KEY, sanitized);
  renderCompetitionCalendarFilter();
}

/** Lukee kilpailukalenterin aktiivisen kilpailutyyppisuodattimen. */
function getCompetitionTypeFilterSelection() {
  return sanitizeCompetitionFilterSelection(
    loadCompetitionArrayFilter(COMPETITION_TYPE_FILTER_STORAGE_KEY),
    competitionCalendarState.availableCompetitionTypes,
  );
}

/** Tallentaa kilpailukalenterin aktiivisen kilpailutyyppisuodattimen. */
function setCompetitionTypeFilter(selectedCompetitionTypes) {
  const sanitized = sanitizeCompetitionFilterSelection(
    selectedCompetitionTypes,
    competitionCalendarState.availableCompetitionTypes,
  );
  saveCompetitionArrayFilter(COMPETITION_TYPE_FILTER_STORAGE_KEY, sanitized);
  renderCompetitionCalendarFilter();
}

/** Vaihtaa yksittäisen arvon monivalintasuodattimessa. */
function toggleCompetitionFilterValue(selectedValues, valueToToggle, setter) {
  const nextSelection = new Set(selectedValues);

  if (nextSelection.has(valueToToggle)) {
    nextSelection.delete(valueToToggle);
  } else {
    nextSelection.add(valueToToggle);
  }

  setter([...nextSelection]);
}

/** Palauttaa valitun roolin kalenterisuodattimien määrittelyn. */
function getCompetitionCalendarFilterConfig(roleId) {
  const divisionGroup = {
    id: 'divisions',
    title: 'Luokat',
    allLabel: 'Kaikki luokat',
    emptyText: 'Luokkasuodatin tulee näkyviin, kun kilpailuille on saatavilla luokkatiedot.',
    availableValues: competitionCalendarState.availableDivisions,
    selectedValues: getCompetitionClassFilterSelection(),
    setSelectedValues: setCompetitionClassFilter,
    getValueLabel(value) {
      return value;
    },
  };

  if (roleId === 'kilpailija') {
    return {
      title: 'Suodata kilpailuja luokilla',
      copy: 'Kilpailija-roolissa voit rajata näkymän omaan luokkaasi tai useaan luokkaan.',
      groups: [divisionGroup],
    };
  }

  if (roleId === 'katsoja') {
    return {
      title: 'Suodata kilpailuja',
      copy: 'Katsoja-roolissa voit rajata kalenteria PDGA-tason ja luokkien perusteella.',
      groups: [
        {
          id: 'pdga-tier',
          title: 'PDGA-taso',
          allLabel: 'Kaikki PDGA-tasot',
          emptyText: 'PDGA-tasosuodatin tulee näkyviin, kun kilpailuilla on PDGA-tasotietoja.',
          availableValues: competitionCalendarState.availablePdgaTiers,
          selectedValues: getCompetitionPdgaTierFilterSelection(),
          setSelectedValues: setCompetitionPdgaTierFilter,
          getValueLabel(value) {
            return getPdgaTierStyle(value).label || value;
          },
        },
        divisionGroup,
      ],
    };
  }

  if (roleId === 'liitto' || roleId === 'kilpailujohtaja') {
    return {
      title: 'Suodata kilpailuja',
      copy: 'Voit rajata kalenteria järjestäjän ja kilpailutyypin perusteella.',
      groups: [
        {
          id: 'organizer',
          title: 'Järjestäjä',
          allLabel: 'Kaikki järjestäjät',
          emptyText: 'Järjestäjäsuodatin tulee näkyviin, kun kilpailuilla on järjestäjätietoja.',
          availableValues: competitionCalendarState.availableOrganizers,
          selectedValues: getCompetitionOrganizerFilterSelection(),
          setSelectedValues: setCompetitionOrganizerFilter,
          getValueLabel(value) {
            return value;
          },
        },
        {
          id: 'competition-type',
          title: 'Kilpailutyyppi',
          allLabel: 'Kaikki kilpailutyypit',
          emptyText: 'Kilpailutyyppisuodatin tulee näkyviin, kun kilpailuilla on kilpailutyyppitietoja.',
          availableValues: competitionCalendarState.availableCompetitionTypes,
          selectedValues: getCompetitionTypeFilterSelection(),
          setSelectedValues: setCompetitionTypeFilter,
          getValueLabel(value) {
            return value;
          },
        },
      ],
    };
  }

  return null;
}

/** Palauttaa tekstin aktiivisista kilpailukalenterisuodattimista. */
function getCompetitionCalendarFilterSummary(filterConfig) {
  if (!filterConfig) {
    return '';
  }

  const activeGroups = filterConfig.groups.filter((group) => group.selectedValues.length > 0);
  if (!activeGroups.length) {
    return 'Näytetään kaikki kilpailut.';
  }

  return `Aktiiviset suodattimet: ${activeGroups
    .map((group) => `${group.title}: ${group.selectedValues.map((value) => group.getValueLabel(value)).join(', ')}`)
    .join(' · ')}.`;
}

/** Palauttaa roolikohtaisesti suodatetut kilpailut. */
function getFilteredCompetitionEvents() {
  const selectedRole = getSelectedRole();
  const selectedDivisions = getCompetitionClassFilterSelection();
  const selectedPdgaTiers = getCompetitionPdgaTierFilterSelection();
  const selectedOrganizers = getCompetitionOrganizerFilterSelection();
  const selectedCompetitionTypes = getCompetitionTypeFilterSelection();

  return competitionCalendarState.events.filter((eventItem) => {
    const divisions = Array.isArray(eventItem?.extendedProps?.divisions) ? eventItem.extendedProps.divisions : [];
    const eventPdgaTier = normalizePdgaTierKey(eventItem?.extendedProps?.pdgatier);
    const organizer = typeof eventItem?.extendedProps?.jarjestaja === 'string'
      ? eventItem.extendedProps.jarjestaja.trim()
      : '';
    const competitionType = typeof eventItem?.extendedProps?.haettavakilpailu === 'string'
      ? eventItem.extendedProps.haettavakilpailu.trim()
      : '';

    if (selectedRole === 'kilpailija' && selectedDivisions.length > 0) {
      return divisions.some((division) => selectedDivisions.includes(division));
    }

    if (selectedRole === 'katsoja') {
      if (selectedPdgaTiers.length > 0 && !selectedPdgaTiers.includes(eventPdgaTier)) {
        return false;
      }

      if (selectedDivisions.length > 0 && !divisions.some((division) => selectedDivisions.includes(division))) {
        return false;
      }
    }

    if ((selectedRole === 'liitto' || selectedRole === 'kilpailujohtaja')) {
      if (selectedOrganizers.length > 0 && !selectedOrganizers.includes(organizer)) {
        return false;
      }

      if (selectedCompetitionTypes.length > 0 && !selectedCompetitionTypes.includes(competitionType)) {
        return false;
      }
    }

    return true;
  });
}

/** Asettaa kilpailukalenterin luokkasuodattimen ja päivittää näkymän. */
function setCompetitionClassFilter(selectedDivisions) {
  const sanitized = sanitizeCompetitionClassFilter(selectedDivisions, competitionCalendarState.availableDivisions);
  saveCompetitionClassFilter(sanitized);
  renderCompetitionCalendarFilter();
}

/** Luo yhden luokkasuodattimen valintapainikkeen. */
function buildCompetitionFilterChip(label, isActive, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'competition-filter-chip';
  button.textContent = label;
  button.setAttribute('aria-pressed', String(isActive));
  button.classList.toggle('is-active', isActive);
  button.addEventListener('click', onClick);
  return button;
}

/** Luo yhden kilpailukalenterin suodatinryhmän. */
function buildCompetitionFilterGroup(groupConfig) {
  const groupEl = document.createElement('section');
  groupEl.className = 'competition-filter-group';

  const titleEl = document.createElement('h4');
  titleEl.className = 'competition-filter-group__title';
  titleEl.textContent = groupConfig.title;
  groupEl.appendChild(titleEl);

  if (!groupConfig.availableValues.length) {
    const emptyEl = document.createElement('p');
    emptyEl.className = 'competition-filter-group__empty';
    emptyEl.textContent = groupConfig.emptyText;
    groupEl.appendChild(emptyEl);
    return groupEl;
  }

  const optionsEl = document.createElement('div');
  optionsEl.className = 'competition-filters__chips';
  optionsEl.setAttribute('role', 'group');
  optionsEl.setAttribute('aria-label', groupConfig.title);

  optionsEl.appendChild(buildCompetitionFilterChip(
    groupConfig.allLabel,
    groupConfig.selectedValues.length === 0,
    () => groupConfig.setSelectedValues([]),
  ));

  groupConfig.availableValues.forEach((value) => {
    optionsEl.appendChild(buildCompetitionFilterChip(
      groupConfig.getValueLabel(value),
      groupConfig.selectedValues.includes(value),
      () => toggleCompetitionFilterValue(groupConfig.selectedValues, value, groupConfig.setSelectedValues),
    ));
  });

  groupEl.appendChild(optionsEl);
  return groupEl;
}

/** Piirtää kilpailukalenterin PDGA-väriselitteen. */
function renderCompetitionCalendarLegend() {
  const legendEl = document.getElementById('competition-calendar-legend');

  if (!legendEl) {
    return;
  }

  const legendItems = Object.keys(PDGA_TIER_MAP)
    .map((tierKey) => `
      <li class="competition-legend__item">
        ${pdgaTierBadgeHtml(tierKey)}
        <span class="competition-legend__text">${escapeHtml(getPdgaTierStyle(tierKey).label)}</span>
      </li>
    `)
    .join('');

  legendEl.innerHTML = `
    <p class="competition-legend__title">PDGA-tasojen värit kalenterissa</p>
    <ul class="competition-legend__list">${legendItems}</ul>
  `;
}

/** Piirtää kilpailukalenterin suodattimet valitulle roolille. */
function renderCompetitionCalendarFilter() {
  const filterContainer = document.getElementById('competition-calendar-filters');
  const filterTitle = document.getElementById('competition-calendar-filter-title');
  const filterCopy = document.getElementById('competition-calendar-filter-copy');
  const filterOptions = document.getElementById('competition-calendar-filter-options');
  const filterSummary = document.getElementById('competition-calendar-filter-summary');
  const statusEl = document.getElementById('competition-calendar-status');

  if (!filterContainer || !filterTitle || !filterCopy || !filterOptions || !filterSummary || !statusEl) {
    return;
  }

  const selectedRole = getSelectedRole();
  const selectedDivisions = getCompetitionClassFilterSelection();
  const selectedPdgaTiers = getCompetitionPdgaTierFilterSelection();
  const selectedOrganizers = getCompetitionOrganizerFilterSelection();
  const selectedCompetitionTypes = getCompetitionTypeFilterSelection();
  const filterConfig = getCompetitionCalendarFilterConfig(selectedRole);
  const hasActiveFilters = filterConfig ? filterConfig.groups.some((group) => group.selectedValues.length > 0) : false;

  filterContainer.hidden = !filterConfig;
  filterOptions.innerHTML = '';

  if (!filterConfig) {
    filterTitle.textContent = '';
    filterCopy.textContent = '';
    filterSummary.textContent = '';
  } else {
    filterTitle.textContent = filterConfig.title;
    filterCopy.textContent = filterConfig.copy;
    filterSummary.textContent = getCompetitionCalendarFilterSummary(filterConfig);
    filterConfig.groups.forEach((groupConfig) => {
      filterOptions.appendChild(buildCompetitionFilterGroup(groupConfig));
    });
  }

  if (!competitionCalendarState.calendar) {
    return;
  }

  const filteredEvents = getFilteredCompetitionEvents();
  const nextFilterKey = JSON.stringify({
    role: selectedRole,
    selectedDivisions,
    selectedPdgaTiers,
    selectedOrganizers,
    selectedCompetitionTypes,
  });

  if (competitionCalendarState.lastFilterKey !== nextFilterKey) {
    competitionCalendarState.lastFilterKey = nextFilterKey;
    competitionCalendarState.calendar.refetchEvents();
  }

  updateCompetitionMap();

  if (competitionCalendarState.events.length === 0) {
    statusEl.textContent = 'Kilpailuja ei löytynyt.';
    statusEl.hidden = false;
    return;
  }

  if (hasActiveFilters && filteredEvents.length === 0) {
    statusEl.textContent = 'Valituilla suodattimilla ei löytynyt kilpailuja.';
    statusEl.hidden = false;
    return;
  }

  statusEl.hidden = true;
}

/**
 * Muotoilee päivämäärän tai välin suomeksi.
 * @param {string} startYmd - YYYY-MM-DD
 * @param {string} endYmd   - YYYY-MM-DD (FullCalendarin eksklusiiviinen end)
 */
function formatCompetitionDateRange(startYmd, endYmd) {
  const start = new Date(startYmd);
  // FullCalendar end on eksklusiiviinen → vähennetään yksi päivä
  const end = new Date(endYmd);
  end.setDate(end.getDate() - 1);

  const opts = { day: 'numeric', month: 'numeric', year: 'numeric' };
  const locale = 'fi-FI';

  if (start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString(locale, opts);
  }

  return `${start.toLocaleDateString(locale, opts)} – ${end.toLocaleDateString(locale, opts)}`;
}

/** Hakee kilpailut API:sta. */
async function fetchCompetitionsFromApi() {
  const response = await fetch(COMPETITIONS_API_URL, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Kilpailujen haku epäonnistui.');
  }

  const parsed = await response.json();
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.map((event) => {
    const tier = event?.extendedProps?.pdgatier;
    const { color } = getPdgaTierStyle(tier);
    return { ...event, color };
  });
}

/** Näyttää kilpailun tiedot modalissa. */
function openCompetitionModal(eventInfo) {
  const modal = document.getElementById('competition-modal');
  const content = document.getElementById('competition-modal-content');
  const { title, startStr, endStr, extendedProps: p } = eventInfo.event;

  const dateRange = formatCompetitionDateRange(startStr, endStr);

  const divisions = Array.isArray(p.divisions) && p.divisions.length > 0
    ? p.divisions.join(', ')
    : '';

  /** @param {string} label @param {string} value */
  function row(label, value) {
    if (!value) return '';
    return `<div class="comp-detail-row">
      <span class="comp-detail-label">${label}</span>
      <span class="comp-detail-value">${escapeHtml(value)}</span>
    </div>`;
  }

  content.innerHTML = `
    <h2 class="comp-detail-title" id="competition-modal-title">${escapeHtml(title)}</h2>
    <div class="comp-detail-grid">
      ${row('Ajankohta', dateRange)}
      ${row('Kilpailutyyppi', p.haettavakilpailu)}
      ${row('Paikkakunta', p.paikkakunta)}
      ${row('Rata', p.rata)}
      ${p.pdgatier ? `<div class="comp-detail-row">
        <span class="comp-detail-label">PDGA-taso</span>
        <span class="comp-detail-value">${pdgaTierBadgeHtml(p.pdgatier)}</span>
      </div>` : ''}
      ${row('Kilpailuluokat', p.kilpailuluokat)}
      ${divisions ? row('Luokat', divisions) : ''}
      ${row('Järjestäjä', p.jarjestaja)}
      ${row('Max pelaajamäärä', p.maxpelaajamaara)}
      ${row('Väylien määrä / pk', p.vaylienmaarapk)}
      ${row('Kierrosten määrä', p.kierrostenmaara)}
      ${row('Kilpailunjohtaja', p.kilpailunjohtaja)}
      ${row('Kilpailunjohtaja PDGA', p.kilpailunjohtajapdga)}
      ${row('Apukilpailunjohtaja', p.apukilpailunjohtaja)}
      ${row('Apukilpailunjohtaja PDGA', p.apukilpailunjohtajapdga)}
    </div>
  `;

  modal.hidden = false;
  document.body.classList.add('modal-open');
  document.getElementById('competition-modal-close').focus();
}

/** Sulkee kilpailumodaali. */
function closeCompetitionModal() {
  const modal = document.getElementById('competition-modal');
  modal.hidden = true;
  document.body.classList.remove('modal-open');
}

/** Poistaa ääkköset ja erikoismerkit kuntahakuavainta varten. */
function normalizeMunicipalityKey(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Pilkkoo paikkakuntakentän mahdolliset vaihtoehdot (esim. "Maarianhamina / Mariehamn"). */
function getMunicipalityCandidates(rawValue) {
  return String(rawValue || '')
    .split(/[\/,;()]/)
    .map((part) => normalizeMunicipalityKey(part))
    .filter(Boolean);
}

/** Palauttaa paikkakunnalle koordinaatit tai null, jos niitä ei löydy. */
function resolveCompetitionCoordinates(paikkakunta) {
  const candidates = getMunicipalityCandidates(paikkakunta);
  for (const candidate of candidates) {
    const key = candidate.replace(/\s+/g, '');
    if (MUNICIPALITY_COORDINATES[key]) {
      return MUNICIPALITY_COORDINATES[key];
    }
    if (MUNICIPALITY_COORDINATES[candidate]) {
      return MUNICIPALITY_COORDINATES[candidate];
    }
  }
  return null;
}

/** Muuntaa kilpailudatan map-markerin modal-klikkaukseen sopivaksi eventInfo-rakenteeksi. */
function toCompetitionModalEventInfo(eventItem) {
  return {
    event: {
      title: eventItem.title,
      startStr: eventItem.start,
      endStr: eventItem.end,
      extendedProps: eventItem.extendedProps || {},
    },
  };
}

/** Palauttaa kilpailut sekä aktiivisten suodattimien että näkyvän kalenterivälin perusteella. */
function getVisibleCompetitionEventsForMap() {
  const visibleEvents = getFilteredCompetitionEvents();

  if (!competitionCalendarState.mapRangeStart || !competitionCalendarState.mapRangeEnd) {
    return visibleEvents;
  }

  const rangeStartTime = competitionCalendarState.mapRangeStart.getTime();
  const rangeEndTime = competitionCalendarState.mapRangeEnd.getTime();

  return visibleEvents.filter((eventItem) => {
    const eventStart = new Date(eventItem.start);
    const eventEndExclusive = new Date(eventItem.end || eventItem.start);
    return eventStart.getTime() < rangeEndTime && eventEndExclusive.getTime() > rangeStartTime;
  });
}

/** Päivittää karttanäkymän markerit aktiivisella suodatus- ja päivämäärärajauksella. */
function updateCompetitionMap() {
  if (!competitionCalendarState.map || !competitionCalendarState.mapMarkersLayer) {
    return;
  }

  const events = getVisibleCompetitionEventsForMap();
  competitionCalendarState.mapMarkersLayer.clearLayers();

  const coordinateUsageCount = new Map();
  const markerCoordinates = [];

  events.forEach((eventItem) => {
    const coords = resolveCompetitionCoordinates(eventItem?.extendedProps?.paikkakunta);
    if (!coords) {
      return;
    }

    const key = `${coords[0].toFixed(MAP_COORDINATE_KEY_PRECISION)},${coords[1].toFixed(MAP_COORDINATE_KEY_PRECISION)}`;
    const usageCount = coordinateUsageCount.get(key) || 0;
    coordinateUsageCount.set(key, usageCount + 1);

    const hasOverlap = usageCount > 0;
    const angle = usageCount * MAP_OVERLAP_OFFSET_ANGLE_STEP;
    const lat = coords[0] + (hasOverlap ? Math.sin(angle) * MAP_OVERLAP_OFFSET_RADIUS : 0);
    const lng = coords[1] + (hasOverlap ? Math.cos(angle) * MAP_OVERLAP_OFFSET_RADIUS : 0);
    const marker = L.marker([lat, lng], {
      title: eventItem.title,
      riseOnHover: true,
    });

    marker.on('click', () => {
      openCompetitionModal(toCompetitionModalEventInfo(eventItem));
    });
    marker.bindTooltip(escapeHtml(eventItem.title));

    competitionCalendarState.mapMarkersLayer.addLayer(marker);
    markerCoordinates.push([lat, lng]);
  });

  if (markerCoordinates.length > 0) {
    competitionCalendarState.map.fitBounds(markerCoordinates, {
      padding: [24, 24],
      maxZoom: MAP_FIT_BOUNDS_MAX_ZOOM,
    });
  } else {
    competitionCalendarState.map.setView(DEFAULT_FINLAND_CENTER_COORDINATES, 5);
  }
}

/** Alustaa kilpailukalenterin karttanäkymän. */
function initCompetitionMap() {
  const mapEl = document.getElementById('competition-calendar-map');
  if (!mapEl || typeof L === 'undefined') {
    return;
  }

  const map = L.map(mapEl, {
    center: DEFAULT_FINLAND_CENTER_COORDINATES,
    zoom: 5,
    minZoom: 4,
    maxBounds: FINLAND_BOUNDS,
    maxBoundsViscosity: 0.8,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  competitionCalendarState.map = map;
  competitionCalendarState.mapMarkersLayer = L.layerGroup().addTo(map);
}

/** Pakenee HTML-erikoismerkit. */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Alustaa FullCalendar-kilpailukalenterin. */
async function initCompetitionCalendar() {
  const calendarEl = document.getElementById('competition-calendar');
  const statusEl = document.getElementById('competition-calendar-status');

  if (!calendarEl) return;
  initCompetitionMap();

  let events = [];

  try {
    events = await fetchCompetitionsFromApi();
  } catch (error) {
    statusEl.textContent = 'Kilpailukalenterin lataus epäonnistui. Tarkista verkko ja yritä uudelleen.';
    statusEl.hidden = false;
    return;
  }

  if (events.length === 0) {
    statusEl.textContent = 'Kilpailuja ei löytynyt.';
    statusEl.hidden = false;
  }

  competitionCalendarState.events = events;
  competitionCalendarState.availableDivisions = getAvailableCompetitionDivisions(events);
  competitionCalendarState.availablePdgaTiers = getAvailableCompetitionPdgaTiers(events);
  competitionCalendarState.availableOrganizers = getAvailableCompetitionValues(
    events,
    (eventItem) => eventItem?.extendedProps?.jarjestaja,
  );
  competitionCalendarState.availableCompetitionTypes = getAvailableCompetitionValues(
    events,
    (eventItem) => eventItem?.extendedProps?.haettavakilpailu,
  );
  saveCompetitionClassFilter(getCompetitionClassFilterSelection());
  saveCompetitionArrayFilter(COMPETITION_PDGA_TIER_FILTER_STORAGE_KEY, getCompetitionPdgaTierFilterSelection());
  saveCompetitionArrayFilter(COMPETITION_ORGANIZER_FILTER_STORAGE_KEY, getCompetitionOrganizerFilterSelection());
  saveCompetitionArrayFilter(COMPETITION_TYPE_FILTER_STORAGE_KEY, getCompetitionTypeFilterSelection());

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'fi',
    firstDay: 1,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,listYear',
    },
    buttonText: {
      today: 'Tänään',
      month: 'Kuukausi',
      week: 'Viikko',
      list: 'Lista',
    },
    events(info, successCallback) {
      successCallback(getFilteredCompetitionEvents());
    },
    datesSet(dateInfo) {
      competitionCalendarState.mapRangeStart = dateInfo.start;
      competitionCalendarState.mapRangeEnd = dateInfo.end;
      updateCompetitionMap();
    },
    eventTextColor: '#ffffff',
    eventDisplay: 'block',
    displayEventTime: false,
    eventClick(info) {
      info.jsEvent.preventDefault();
      openCompetitionModal(info);
    },
    eventDidMount(info) {
      info.el.setAttribute('title', info.event.title);
    },
    noEventsText: 'Ei kilpailuja tällä ajanjaksolla.',
    views: {
      listYear: {
        buttonText: 'Lista',
        noEventsText: 'Ei kilpailuja tällä ajanjaksolla.',
      },
    },
  });

  competitionCalendarState.calendar = calendar;
  calendar.render();
  renderCompetitionCalendarFilter();
  updateCompetitionMap();

  // Modalin sulkeminen
  document.getElementById('competition-modal-close').addEventListener('click', closeCompetitionModal);
  document.querySelector('.competition-modal__backdrop').addEventListener('click', closeCompetitionModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCompetitionModal();
    }
  });
}
