/**
 * Kilpailukalenterijärjestelmä – Prototyyppi
 * Roolivalintalogiikka etusivulle
 *
 * Roolit (ei tietokantaa, ei kirjautumista):
 *   admin, liitto, kilpailujohtaja, kilpailija, katsoja
 *
 * Valittu rooli tallennetaan sessionStorageen, jotta sivuston
 * muissa osissa (tulevissa vaiheissa) voidaan näyttää roolin
 * mukainen sisältö.
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

/** Palauttaa tällä hetkellä valitun roolin sessionStoragesta. */
function getSelectedRole() {
  return sessionStorage.getItem('selectedRole');
}

/** Tallentaa valitun roolin ja päivittää käyttöliittymän. */
function selectRole(roleId) {
  sessionStorage.setItem('selectedRole', roleId);
  renderUI();
}

/** Päivittää koko käyttöliittymän valitun roolin mukaan. */
function renderUI() {
  const selectedId = getSelectedRole();

  // Päivitä korttien valinta-tila
  document.querySelectorAll('.role-card').forEach((card) => {
    const isSelected = card.dataset.roleId === selectedId;
    card.classList.toggle('selected', isSelected);
    card.setAttribute('aria-pressed', String(isSelected));
  });

  // Päivitä valitun roolin banneri
  const banner = document.getElementById('selected-banner');
  if (selectedId) {
    const role = ROLES.find((r) => r.id === selectedId);
    document.getElementById('banner-icon').textContent = role.icon;
    document.getElementById('banner-role').textContent = role.name;
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

/** Rakentaa roolikortit DOM:iin. */
function buildRoleCards() {
  const grid = document.getElementById('role-grid');
  grid.innerHTML = '';

  ROLES.forEach((role) => {
    const card = document.createElement('button');
    card.className = 'role-card';
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

/** Alustaa sovelluksen sivun latautuessa. */
document.addEventListener('DOMContentLoaded', () => {
  buildRoleCards();
  renderUI();
});
