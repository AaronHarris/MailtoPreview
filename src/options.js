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
  "gmail": "https://mail.google.com/mail/?view=cm&fs=1&to={{to}}&cc={{cc}}&bcc={{bcc}}&su={{subject}}&body={{body}}",
  "outlook": "https://outlook.live.com/mail/0/deeplink/compose?to={{to}}&cc={{cc}}&bcc={{bcc}}&subject={{subject}}&body={{body}}",
  "yahoo": "https://compose.mail.yahoo.com/?to={{to}}&cc={{cc}}&bcc={{bcc}}&subject={{subject}}&body={{body}}",
  "protonmail": "https://mail.proton.me/u/0/compose?to={{to}}&cc={{cc}}&bcc={{bcc}}&subject={{subject}}&body={{body}}"
};

let editingProfile = null;

document.addEventListener('DOMContentLoaded', async () => {
  const data = await chrome.storage.sync.get('profiles');
  let profiles = data.profiles || {};
  
  // If no profiles in storage, use default profiles
  if (Object.keys(profiles).length === 0) {
    profiles = defaultProfiles;
  }
  
  renderProfiles(profiles);
});

function renderProfiles(profiles) {
  container.innerHTML = '';

  const addCard = document.createElement('div');
  addCard.className = 'profile-card add-card';
  addCard.innerHTML = `
    <div class="add-icon" style="display: flex; justify-content: center; align-items: center;">
      <img src="../assets/Letter.svg" alt="Add Icon" style="width: 80px; height: 80px;" />
    </div>
    <p class="add-label">Add New Profile</p>`;
  addCard.addEventListener('click', () => openModal());
  container.appendChild(addCard);

  for (const [name, template] of Object.entries(profiles)) {
    const card = document.createElement('div');
    card.className = 'profile-card';

    // Display name mapping for default services
    const displayNames = {
      'gmail': 'Gmail',
      'outlook': 'Outlook',
      'yahoo': 'Yahoo Mail',
      'protonmail': 'ProtonMail'
    };
    
    const displayName = displayNames[name] || name;

    card.innerHTML = `
      <strong>${displayName}</strong>
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
  if (confirm('This will replace all current profiles with the default ones. Continue?')) {
    await chrome.storage.sync.set({ profiles: { ...defaultProfiles } });
    renderProfiles(defaultProfiles);
    console.log('MailToWith: Default profiles restored');
  }
});