// MailToWith - Modern Popup Logic (Proton-style UI)
// Manages quick provider settings and opening the full options page.

document.addEventListener('DOMContentLoaded', async () => {
  const providerSelect = document.getElementById('provider');
  const openProfiles = document.getElementById('openOptions');
  const status = document.getElementById('status');

  const defaultProfiles = {
    "gmail": "https://mail.google.com/mail/?view=cm&fs=1&to={{to}}&cc={{cc}}&bcc={{bcc}}&su={{subject}}&body={{body}}",
    "outlook": "https://outlook.live.com/mail/0/deeplink/compose?to={{to}}&cc={{cc}}&bcc={{bcc}}&subject={{subject}}&body={{body}}",
    "yahoo": "https://compose.mail.yahoo.com/?to={{to}}&cc={{cc}}&bcc={{bcc}}&subject={{subject}}&body={{body}}",
    "protonmail": "https://mail.proton.me/u/0/compose?to={{to}}&cc={{cc}}&bcc={{bcc}}&subject={{subject}}&body={{body}}"
  };

  async function populateProfilesDropdown() {
    const data = await chrome.storage.sync.get(['profiles', 'selectedService']);
    let profiles = data.profiles || {};
    
    // If no profiles in storage, use default profiles
    if (Object.keys(profiles).length === 0) {
      profiles = defaultProfiles;
    }

    // Display name mapping for default services
    const displayNames = {
      'gmail': 'Gmail',
      'outlook': 'Outlook',
      'yahoo': 'Yahoo Mail',
      'protonmail': 'ProtonMail'
    };

    providerSelect.innerHTML = '';
    for (const name in profiles) {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = displayNames[name] || name;
      providerSelect.appendChild(option);
    }

    // Restore last selected
    if (data.selectedService && profiles[data.selectedService]) {
      providerSelect.value = data.selectedService;
    } else {
      // Fallback selection
      const firstKey = Object.keys(profiles)[0];
      providerSelect.value = firstKey;
      await chrome.storage.sync.set({ selectedService: firstKey });
    }
  }

  // Listen to storage changes (syncs with options)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.profiles) {
      populateProfilesDropdown();
    }
  });

  await populateProfilesDropdown();

  // Auto-save selected profile when changed
  providerSelect.addEventListener('change', async () => {
    const selectedService = providerSelect.value;
    await chrome.storage.sync.set({ selectedService });
    status.textContent = 'Saved ✓';
    setTimeout(() => status.textContent = '', 2000);
  });

  // Preview window is on unless the user opts out
  const previewToggle = document.getElementById('previewToggle');
  const { previewEnabled } = await chrome.storage.sync.get({ previewEnabled: true });
  previewToggle.checked = previewEnabled;

  previewToggle.addEventListener('change', async () => {
    await chrome.storage.sync.set({ previewEnabled: previewToggle.checked });
    status.textContent = 'Saved ✓';
    setTimeout(() => status.textContent = '', 2000);
  });

  // Open Email Profiles (full Options page)
  openProfiles.addEventListener('click', () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('src/options.html'));
    }
  });
});