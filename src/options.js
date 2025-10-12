// MailToG - Options Logic with Full CRUD Profiles

const container = document.getElementById('profilesContainer');
const addBtn = document.getElementById('addProfileBtn');
const restoreBtn = document.getElementById('restoreBtn');
const statusText = document.getElementById('status');
const nameInput = document.getElementById('profileName');
const templateInput = document.getElementById('profileTemplate');

// Default profiles
const defaultProfiles = {
  "Gmail": "https://mail.google.com/mail/?view=cm&fs=1&to={{to}}&su={{subject}}&body={{body}}",
  "Outlook": "https://outlook.live.com/owa/?path=/mail/action/compose&to={{to}}&subject={{subject}}&body={{body}}",
  "Yahoo": "https://compose.mail.yahoo.com/?to={{to}}&subject={{subject}}&body={{body}}",
  "ProtonMail": "https://mail.proton.me/u/0/inbox?to={{to}}&subject={{subject}}&body={{body}}"
};

// Load profiles
document.addEventListener('DOMContentLoaded', async () => {
  const data = await chrome.storage.sync.get('profiles');
  const profiles = data.profiles || defaultProfiles;
  renderProfiles(profiles);
});

// Add new profile
addBtn.addEventListener('click', async () => {
  const name = nameInput.value.trim();
  const template = templateInput.value.trim();

  if (!name || !template) {
    updateStatus('Please enter both name and template.');
    return;
  }

  const data = await chrome.storage.sync.get('profiles');
  const profiles = data.profiles || {};

  if (profiles[name]) {
    updateStatus('Profile name must be unique.');
    return;
  }

  profiles[name] = template;
  await chrome.storage.sync.set({ profiles });

  nameInput.value = '';
  templateInput.value = '';
  renderProfiles(profiles);
  updateStatus('Profile added.');
});

// Restore defaults
restoreBtn.addEventListener('click', async () => {
  await chrome.storage.sync.set({ profiles: { ...defaultProfiles } });
  renderProfiles(defaultProfiles);
  updateStatus('Default profiles restored.');
});

// Render profiles visually as cards
function renderProfiles(profiles) {
  container.innerHTML = '';
  Object.entries(profiles).forEach(([name, template]) => {
    const card = document.createElement('div');
    card.className = 'profile-card';

    const header = document.createElement('div');
    header.className = 'profile-header';
    header.textContent = name;

    const templateField = document.createElement('div');
    templateField.className = 'template-field';
    templateField.textContent = template;

    const actions = document.createElement('div');
    actions.className = 'profile-actions';

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => startEdit(name, template));

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.classList.add('danger');
    deleteBtn.addEventListener('click', () => deleteProfile(name));

    actions.append(editBtn, deleteBtn);
    card.append(header, templateField, actions);
    container.appendChild(card);
  });
}

// Start editing a profile
function startEdit(name, template) {
  nameInput.value = name;
  templateInput.value = template;

  // Show cancel edit option
  document.getElementById('editControls').style.display = 'block';

  addBtn.textContent = 'Save Changes';
  addBtn.classList.add('editing');

  // Temporarily save original state
  const originalAddHandler = addBtn.onclick;

  const saveChanges = async () => {
    const newName = nameInput.value.trim();
    const newTemplate = templateInput.value.trim();
    if (!newName || !newTemplate) {
      updateStatus('Fields cannot be empty.');
      return;
    }
    const data = await chrome.storage.sync.get('profiles');
    const profiles = data.profiles || {};
    delete profiles[name];
    profiles[newName] = newTemplate;
    await chrome.storage.sync.set({ profiles });
    resetEditMode();
    renderProfiles(profiles);
    updateStatus('Profile updated.');
  };

  addBtn.onclick = saveChanges;

  // Cancel edit handling
  const cancelBtn = document.getElementById('cancelEditBtn');
  cancelBtn.onclick = () => {
    nameInput.value = '';
    templateInput.value = '';
    resetEditMode();
    updateStatus('Edit canceled.');
  };
}

function resetEditMode() {
  addBtn.textContent = 'Add Profile';
  addBtn.classList.remove('editing');
  document.getElementById('editControls').style.display = 'none';
  addBtn.onclick = null;
  addBtn.removeEventListener('click', addBtnHandler);
  addBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    const template = templateInput.value.trim();

    if (!name || !template) {
      updateStatus('Please enter both name and template.');
      return;
    }

    const data = await chrome.storage.sync.get('profiles');
    const profiles = data.profiles || {};
    if (profiles[name]) {
      updateStatus('Profile name must be unique.');
      return;
    }

    profiles[name] = template;
    await chrome.storage.sync.set({ profiles });

    nameInput.value = '';
    templateInput.value = '';
    renderProfiles(profiles);
    updateStatus('Profile added.');
  });
}

// Delete a profile
async function deleteProfile(name) {
  const confirmed = confirm(`Delete profile "${name}"?`);
  if (!confirmed) return;

  const data = await chrome.storage.sync.get('profiles');
  const profiles = data.profiles || {};
  delete profiles[name];
  await chrome.storage.sync.set({ profiles });
  renderProfiles(profiles);
  updateStatus('Profile deleted.');
}

// Helper: handle adding new profile (for restoring event after edit)
async function addBtnHandler() {
  addBtn.click();
}

// Common status handler
function updateStatus(msg) {
  statusText.textContent = msg;
  setTimeout(() => (statusText.textContent = ''), 2000);
}

// Context menu integration in background.js will rebuild items from chrome.storage.sync profiles.