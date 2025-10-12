// MailToWith - Modern Popup Logic (Proton-style UI)
// Manages quick provider settings and opening the full options page.

document.addEventListener('DOMContentLoaded', async () => {
  const providerSelect = document.getElementById('provider');
  const openProfiles = document.getElementById('openOptions');
  const status = document.getElementById('status');

  const defaultProfiles = {
    "Gmail": "https://mail.google.com/mail/?view=cm&fs=1&to={{to}}&su={{subject}}&body={{body}}",
    "Outlook": "https://outlook.live.com/owa/?path=/mail/action/compose&to={{to}}&subject={{subject}}&body={{body}}",
    "Yahoo": "https://compose.mail.yahoo.com/?to={{to}}&subject={{subject}}&body={{body}}",
    "ProtonMail": "https://mail.proton.me/u/0/inbox?to={{to}}&subject={{subject}}&body={{body}}"
  };

  async function populateProfilesDropdown() {
    const data = await chrome.storage.sync.get(['profiles', 'selectedService']);
    const profiles = data.profiles || defaultProfiles;

    providerSelect.innerHTML = '';
    for (const name in profiles) {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
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

  // Open Email Profiles (full Options page)
  openProfiles.addEventListener('click', () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('src/options.html'));
    }
  });
});