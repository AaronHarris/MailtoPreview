// MailToWith - Background Service Worker
// Opens a compose preview window for mailto links, then hands off to the chosen webmail client

import { TEMPLATES, parseMailtoData, buildComposeURL } from './mailto.js';

const PREVIEW_SIZE = { width: 760, height: 780 };

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'MAILTO_CLICK' && message.mailto) {
    openPreviewWindow(message.mailto);
  }
  if (message.type === 'OPEN_COMPOSE' && message.mailto) {
    openCompose(message.service, message.mailto, sender.tab?.windowId);
  }
});

async function getSelectedMailService() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['selectedService', 'profiles'], (data) => {
      const service = data.selectedService || 'gmail';
      
      // If no profiles in storage, use the hardcoded TEMPLATES as fallback
      let customServices = data.profiles || {};
      
      // If storage is empty, populate with default templates
      if (Object.keys(customServices).length === 0) {
        customServices = {
          "gmail": TEMPLATES.gmail,
          "outlook": TEMPLATES.outlook,
          "yahoo": TEMPLATES.yahoo,
          "protonmail": TEMPLATES.protonmail
        };
      }
      
      resolve({ service, customServices });
    });
  });
}

/** Open the compose preview popup for a mailto link. */
async function openPreviewWindow(mailto) {
  if (!mailto || typeof mailto !== 'string' || !mailto.startsWith('mailto:')) {
    console.warn('MailToWith: invalid mailto message received', mailto);
    return;
  }

  try {
    await chrome.windows.create({
      url: chrome.runtime.getURL(`src/preview.html?mailto=${encodeURIComponent(mailto)}`),
      type: 'popup',
      width: PREVIEW_SIZE.width,
      height: PREVIEW_SIZE.height
    });
  } catch (error) {
    console.error('MailToWith: failed to open preview window', error);
  }
}

/** Hand the previewed message off to a webmail client, then close the preview. */
async function openCompose(service, mailto, previewWindowId) {
  try {
    const data = parseMailtoData(mailto);
    const { service: defaultService, customServices } = await getSelectedMailService();
    const url = buildComposeURL((service || defaultService).toLowerCase().trim(), data, customServices);
    await chrome.tabs.create({ url });
    // The preview usually closes itself; this is the fallback if it could not
    if (previewWindowId) await chrome.windows.remove(previewWindowId).catch(() => {});
  } catch (error) {
    console.error('MailToWith: failed to open compose window', error);
  }
}


// Debounce mechanism for context menu updates
let contextMenuUpdateTimeout = null;

// Function to create/update context menus
async function updateContextMenus() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['profiles'], (data) => {
      let customServices = data.profiles || {};
      
      // If storage is empty, use hardcoded templates as fallback
      if (Object.keys(customServices).length === 0) {
        customServices = {
          "gmail": TEMPLATES.gmail,
          "outlook": TEMPLATES.outlook,
          "yahoo": TEMPLATES.yahoo,
          "protonmail": TEMPLATES.protonmail
        };
      }
      
      // Remove all existing menu items to prevent duplication
      chrome.contextMenus.removeAll(() => {
        try {
          // Root menu
          chrome.contextMenus.create({
            id: 'rootMailToWith',
            title: 'Open in MailToWith',
            contexts: ['link'],
            targetUrlPatterns: ['mailto:*']
          }, () => {
            if (chrome.runtime.lastError) {
              console.warn('MailToWith: Error creating root menu:', chrome.runtime.lastError.message);
            }
          });

          // Create submenu entries for all available providers
          const defaultServices = ['gmail', 'outlook', 'yahoo', 'protonmail'];
          const displayNames = {
            'gmail': 'Gmail',
            'outlook': 'Outlook',
            'yahoo': 'Yahoo Mail',
            'protonmail': 'ProtonMail'
          };

          // Create entries for all services (default and custom)
          for (const [key, template] of Object.entries(customServices)) {
            const isDefault = defaultServices.includes(key.toLowerCase());
            const menuId = isDefault ? `mailto-${key}` : `mailto-custom-${key}`;
            const displayName = displayNames[key.toLowerCase()] || key;
            
            chrome.contextMenus.create({
              id: menuId,
              parentId: 'rootMailToWith',
              title: displayName,
              contexts: ['link'],
              targetUrlPatterns: ['mailto:*']
            }, () => {
              if (chrome.runtime.lastError) {
                console.warn(`MailToWith: Error creating menu for ${key}:`, chrome.runtime.lastError.message);
              }
            });
          }
          
          resolve();
        } catch (error) {
          console.error('MailToWith: Error in updateContextMenus:', error);
          reject(error);
        }
      });
    });
  });
}

// Initialize default values when first installed
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const data = await chrome.storage.sync.get(['selectedService', 'profiles']);
    
    // Default profiles that match the TEMPLATES constant
    const defaultProfiles = {
      "gmail": "https://mail.google.com/mail/?view=cm&fs=1&to={{to}}&cc={{cc}}&bcc={{bcc}}&su={{subject}}&body={{body}}",
      "outlook": "https://outlook.live.com/mail/0/deeplink/compose?to={{to}}&cc={{cc}}&bcc={{bcc}}&subject={{subject}}&body={{body}}",
      "yahoo": "https://compose.mail.yahoo.com/?to={{to}}&cc={{cc}}&bcc={{bcc}}&subject={{subject}}&body={{body}}",
      "protonmail": "https://mail.proton.me/u/0/compose?to={{to}}&cc={{cc}}&bcc={{bcc}}&subject={{subject}}&body={{body}}"
    };
    
    // Initialize storage with defaults if not already set
    const updates = {};
    
    if (!data.selectedService) {
      updates.selectedService = 'gmail';
    }
    
    if (!data.profiles || Object.keys(data.profiles).length === 0) {
      updates.profiles = defaultProfiles;
    }
    
    if (Object.keys(updates).length > 0) {
      updates.version = '1.0.0';
      await chrome.storage.sync.set(updates);
      console.log('MailToWith: Default profiles initialized in storage');
    }
    
    // Create initial context menus
    await updateContextMenus();
    console.log('MailToWith: Extension installed and context menus created');
  } catch (error) {
    console.error('MailToWith: Error during installation:', error);
  }
});

// Handle extension startup (when Chrome starts)
chrome.runtime.onStartup.addListener(async () => {
  try {
    await updateContextMenus();
    console.log('MailToWith: Extension started and context menus created');
  } catch (error) {
    console.error('MailToWith: Error during startup:', error);
  }
});

// Listen for storage changes to update context menus when profiles change
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'sync' && changes.profiles) {
    // Debounce context menu updates to prevent rapid successive calls
    if (contextMenuUpdateTimeout) {
      clearTimeout(contextMenuUpdateTimeout);
    }
    
    contextMenuUpdateTimeout = setTimeout(async () => {
      try {
        await updateContextMenus();
        console.log('MailToWith: Context menus updated after profile changes');
      } catch (error) {
        console.error('MailToWith: Failed to update context menus:', error);
      }
    }, 300); // 300ms debounce
  }
});

// Listener for context menu click on mailto links
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId.startsWith('mailto-') && info.linkUrl?.startsWith('mailto:')) {
    try {
      let service = info.menuItemId.replace(/^mailto-/, '').replace(/^custom-/, '');
      const { customServices } = await getSelectedMailService();
      const mailtoURL = info.linkUrl;
      const data = parseMailtoData(mailtoURL);
      const url = buildComposeURL(service, data, customServices);
      await chrome.tabs.create({ url });
    } catch (error) {
      console.error('MailToWith: submenu click failed', error);
    }
  }
});
