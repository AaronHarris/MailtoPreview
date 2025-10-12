// MailToWith - Enhanced Options and Modal CRUD Logic

const container = document.getElementById('profilesContainer');
const restoreBtn = document.getElementById('restoreBtn');
const modal = document.getElementById('profileModal');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalName = document.getElementById('modalProfileName');
const modalTemplate = document.getElementById('modalProfileTemplate');
const saveBtn = document.getElementById('saveProfileBtn');
const cancelModal = document.getElementById('cancelModalBtn');

const defaultProfiles = {
  "Gmail": "https://mail.google.com/mail/?view=cm&fs=1&to={{to}}&su={{subject}}&body={{body}}",
  "Outlook": "https://outlook.live.com/owa/?path=/mail/action/compose&to={{to}}&subject={{subject}}&body={{body}}",
  "Yahoo": "https://compose.mail.yahoo.com/?to={{to}}&subject={{subject}}&body={{body}}",
  "ProtonMail": "https://mail.proton.me/u/0/inbox?to={{to}}&subject={{subject}}&body={{body}}"
};

let editingProfile = null;

document.addEventListener('DOMContentLoaded', async () => {
  const data = await chrome.storage.sync.get('profiles');
  renderProfiles(data.profiles || defaultProfiles);
});

function renderProfiles(profiles) {
  container.innerHTML = '';

  const addCard = document.createElement('div');
  addCard.className = 'profile-card add-card';
  addCard.innerHTML = `
    <div class="add-icon">📧</div>
    <p class="add-label">Add New Profile</p>`;
  addCard.addEventListener('click', () => openModal());
  container.appendChild(addCard);

  for (const [name, template] of Object.entries(profiles)) {
    const card = document.createElement('div');
    card.className = 'profile-card';

    card.innerHTML = `
      <strong>${name}</strong>
      <p class="template">${template}</p>
      <div class="actions">
        <button class="edit-btn">Edit</button>
        <button class="delete-btn">Delete</button>
      </div>
    `;

    card.querySelector('.edit-btn').addEventListener('click', () =>
      openModal(name, template)
    );
    card.querySelector('.delete-btn').addEventListener('click', () =>
      deleteProfile(name)
    );

    container.appendChild(card);
  }
}

function openModal(name = '', template = '') {
  editingProfile = name || null;
  modalName.value = name;
  modalTemplate.value = template;
  modal.classList.remove('hidden');
  modalBackdrop.classList.remove('hidden');
}

cancelModal.addEventListener('click', () => closeModal());

async function saveProfile() {
  const name = modalName.value.trim();
  const template = modalTemplate.value.trim();
  if (!name || !template) return alert('Please fill all fields.');

  const { profiles = {} } = await chrome.storage.sync.get('profiles');
  if (editingProfile && editingProfile !== name) delete profiles[editingProfile];
  profiles[name] = template;

  await chrome.storage.sync.set({ profiles });
  closeModal();
  renderProfiles(profiles);
}

saveBtn.addEventListener('click', saveProfile);

function closeModal() {
  modal.classList.add('hidden');
  modalBackdrop.classList.add('hidden');
  editingProfile = null;
}

async function deleteProfile(name) {
  if (!confirm(`Delete profile "${name}"?`)) return;
  const { profiles = {} } = await chrome.storage.sync.get('profiles');
  delete profiles[name];
  await chrome.storage.sync.set({ profiles });
  renderProfiles(profiles);
}

restoreBtn.addEventListener('click', async () => {
  await chrome.storage.sync.set({ profiles: { ...defaultProfiles } });
  renderProfiles(defaultProfiles);
});