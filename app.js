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
const COMPETITION_DIVISION_ORDER = ['MPO', 'FPO', 'MP40', 'FP40', 'MP50', 'FP50', 'MP55', 'FP55', 'MP60', 'FP60', 'MP65', 'FP65', 'MP70', 'FP70', 'MP75', 'FP75', 'MP80', 'FP80'];
let cachedNewsItems = [];
const competitionCalendarState = {
  calendar: null,
  events: [],
  availableDivisions: [],
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

/** Lukee kilpailukalenterin luokkasuodattimen sessionStoragesta. */
function loadCompetitionClassFilter() {
  try {
    const rawValue = sessionStorage.getItem(COMPETITION_CLASS_FILTER_STORAGE_KEY);
    const parsed = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : [];
  } catch (error) {
    return [];
  }
}

/** Tallentaa kilpailukalenterin luokkasuodattimen sessionStorageen. */
function saveCompetitionClassFilter(selectedDivisions) {
  sessionStorage.setItem(COMPETITION_CLASS_FILTER_STORAGE_KEY, JSON.stringify(selectedDivisions));
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

/** Suodattaa tallennetut luokat vain saatavilla oleviin arvoihin. */
function sanitizeCompetitionClassFilter(selectedDivisions, availableDivisions) {
  const selectedSet = new Set(
    selectedDivisions.filter((division) => typeof division === 'string'),
  );

  return availableDivisions.filter((division) => selectedSet.has(division));
}

/** Palauttaa aktiivisen kilpailukalenterin luokkasuodattimen. */
function getCompetitionClassFilterSelection() {
  return sanitizeCompetitionClassFilter(loadCompetitionClassFilter(), competitionCalendarState.availableDivisions);
}

/** Palauttaa roolikohtaisesti suodatetut kilpailut. */
function getFilteredCompetitionEvents() {
  const selectedRole = getSelectedRole();
  const selectedDivisions = getCompetitionClassFilterSelection();

  if (selectedRole !== 'kilpailija' || selectedDivisions.length === 0) {
    return competitionCalendarState.events;
  }

  const selectedDivisionSet = new Set(selectedDivisions);

  return competitionCalendarState.events.filter((eventItem) => {
    const divisions = Array.isArray(eventItem?.extendedProps?.divisions) ? eventItem.extendedProps.divisions : [];
    return divisions.some((division) => selectedDivisionSet.has(division));
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

/** Piirtää kilpailukalenterin luokkasuodattimen valitulle roolille. */
function renderCompetitionCalendarFilter() {
  const filterContainer = document.getElementById('competition-calendar-filters');
  const filterOptions = document.getElementById('competition-calendar-filter-options');
  const filterSummary = document.getElementById('competition-calendar-filter-summary');
  const statusEl = document.getElementById('competition-calendar-status');

  if (!filterContainer || !filterOptions || !filterSummary || !statusEl) {
    return;
  }

  const selectedRole = getSelectedRole();
  const isCompetitorView = selectedRole === 'kilpailija';
  const availableDivisions = competitionCalendarState.availableDivisions;
  const selectedDivisions = getCompetitionClassFilterSelection();

  filterContainer.hidden = !isCompetitorView;
  filterOptions.innerHTML = '';

  if (!isCompetitorView) {
    filterSummary.textContent = '';
  } else if (!availableDivisions.length) {
    filterSummary.textContent = 'Luokkasuodatin tulee näkyviin, kun kilpailuille on saatavilla luokkatiedot.';
  } else {
    filterSummary.textContent = selectedDivisions.length > 0
      ? `Näytetään luokat: ${selectedDivisions.join(', ')}.`
      : 'Näytetään kaikki luokat.';

    filterOptions.appendChild(buildCompetitionFilterChip('Kaikki luokat', selectedDivisions.length === 0, () => {
      setCompetitionClassFilter([]);
    }));

    availableDivisions.forEach((division) => {
      const isActive = selectedDivisions.includes(division);
      filterOptions.appendChild(buildCompetitionFilterChip(division, isActive, () => {
        const nextSelection = new Set(getCompetitionClassFilterSelection());

        if (nextSelection.has(division)) {
          nextSelection.delete(division);
        } else {
          nextSelection.add(division);
        }

        setCompetitionClassFilter([...nextSelection]);
      }));
    });
  }

  if (!competitionCalendarState.calendar) {
    return;
  }

  const filteredEvents = getFilteredCompetitionEvents();
  const nextFilterKey = JSON.stringify({
    role: selectedRole,
    selectedDivisions,
  });

  if (competitionCalendarState.lastFilterKey !== nextFilterKey) {
    competitionCalendarState.lastFilterKey = nextFilterKey;
    competitionCalendarState.calendar.refetchEvents();
  }

  if (competitionCalendarState.events.length === 0) {
    statusEl.textContent = 'Kilpailuja ei löytynyt.';
    statusEl.hidden = false;
    return;
  }

  if (isCompetitorView && selectedDivisions.length > 0 && filteredEvents.length === 0) {
    statusEl.textContent = 'Valituilla luokilla ei löytynyt kilpailuja.';
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

  return parsed;
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
      ${row('PDGA-taso', p.pdgatier)}
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
  saveCompetitionClassFilter(getCompetitionClassFilterSelection());

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
    eventColor: '#1a56db',
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

  // Modalin sulkeminen
  document.getElementById('competition-modal-close').addEventListener('click', closeCompetitionModal);
  document.querySelector('.competition-modal__backdrop').addEventListener('click', closeCompetitionModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCompetitionModal();
    }
  });
}
