/**
 * Kilpailukalenterijärjestelmä – Prototyyppi
 * Roolivalinta ja uutisnäkymät etusivulle
 *
 * Roolit (ei tietokantaa, ei kirjautumista):
 *   admin, liitto, kilpailujohtaja, kilpailija, katsoja
 *
 * Valittu rooli tallennetaan sessionStorageen ja uutiset sekä tykkäykset
 * localStorageen, jotta prototyyppi toimii myös sivun päivityksen jälkeen.
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
    name: 'Kilpailujohtaja',
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

const NEWS_STORAGE_KEY = 'kalenteriNews';
const NEWS_LIKES_STORAGE_KEY = 'kalenteriNewsLikes';

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

/** Lukee localStoragesta uutiset. */
function loadNews() {
  try {
    const rawValue = localStorage.getItem(NEWS_STORAGE_KEY);
    const parsed = rawValue ? JSON.parse(rawValue) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => normalizeNews(item))
      .filter(Boolean);
  } catch (error) {
    return [];
  }
}

/** Tallentaa uutiset localStorageen. */
function saveNews(newsItems) {
  localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(newsItems));
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

/** Normalisoi yksittäisen uutisolion turvalliseen muotoon. */
function normalizeNews(item) {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const section = item.section === 'liitto' ? 'liitto' : item.section === 'admin' ? 'admin' : null;
  if (!section) {
    return null;
  }

  const visibleRoles = Array.isArray(item.visibleRoles)
    ? [...new Set(item.visibleRoles.filter((roleId) => ROLES.some((role) => role.id === roleId) && roleId !== section))]
    : [];

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
function handleNewsSubmit(event) {
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

  if (newsId) {
    const newsIndex = newsItems.findIndex((item) => item.id === newsId);
    if (newsIndex === -1 || newsItems[newsIndex].section !== section) {
      closeEditor();
      renderApp();
      return;
    }

    newsItems[newsIndex] = {
      ...newsItems[newsIndex],
      title,
      content,
      visibleRoles,
    };
  } else {
    newsItems.push({
      id: createNewsId(),
      section,
      title,
      content,
      visibleRoles,
      publishedAt: new Date().toISOString(),
      likesCount: 0,
    });
  }

  saveNews(newsItems);
  closeEditor();
  renderApp();
}

/** Poistaa uutisen ja siihen liittyvät tykkäysmerkinnät. */
function deleteNews(newsId) {
  const selectedRole = getSelectedRole();
  const newsItems = loadNews();
  const newsItem = newsItems.find((item) => item.id === newsId);

  if (!newsItem || !canManageSection(newsItem.section, selectedRole)) {
    return;
  }

  if (!window.confirm('Haluatko varmasti poistaa uutisen?')) {
    return;
  }

  saveNews(newsItems.filter((item) => item.id !== newsId));

  const likesByRole = loadNewsLikes();
  Object.keys(likesByRole).forEach((roleId) => {
    const likedNewsIds = Array.isArray(likesByRole[roleId]) ? likesByRole[roleId] : [];
    likesByRole[roleId] = likedNewsIds.filter((likedNewsId) => likedNewsId !== newsId);
  });
  saveNewsLikes(likesByRole);

  window.location.hash = '#news';
  closeEditor();
  renderApp();
}

/** Lisää tai poistaa tykkäyksen valitulta roolilta. */
function toggleNewsLike(newsId) {
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
  saveNewsLikes(likesByRole);
  saveNews(newsItems);
  renderApp();
}

/** Päivittää koko käyttöliittymän nykyisen tilan mukaan. */
function renderApp() {
  renderRoleSelection();
  renderNewsLists();
  renderNewsDetail();
}

/** Alustaa staattiset kuuntelijat. */
function bindEventListeners() {
  document.getElementById('news-form').addEventListener('submit', handleNewsSubmit);
  document.getElementById('cancel-news-button').addEventListener('click', closeEditor);
  window.addEventListener('hashchange', renderApp);
}

/** Alustaa sovelluksen sivun latautuessa. */
document.addEventListener('DOMContentLoaded', () => {
  if (!window.location.hash) {
    window.location.hash = '#news';
  }

  buildRoleCards();
  bindEventListeners();
  renderApp();
});
