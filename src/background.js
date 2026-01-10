// MailToWith - Background Service Worker
// Handles mailto link redirect to chosen webmail client

const TEMPLATES = {
  gmail: 'https://mail.google.com/mail/?view=cm&fs=1&to={{to}}&cc={{cc}}&bcc={{bcc}}&su={{subject}}&body={{body}}',
  outlook: 'https://outlook.live.com/mail/0/deeplink/compose?to={{to}}&cc={{cc}}&bcc={{bcc}}&subject={{subject}}&body={{body}}',
  yahoo: 'https://compose.mail.yahoo.com/?to={{to}}&cc={{cc}}&bcc={{bcc}}&subject={{subject}}&body={{body}}',
  protonmail: 'https://mail.proton.me/u/0/compose?to={{to}}&cc={{cc}}&bcc={{bcc}}&subject={{subject}}&body={{body}}'
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'MAILTO_CLICK' && message.mailto) {
    handleMailtoClick(message.mailto);
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

/**
 * Parse a mailto URL into structured W3C-compliant fields following RFC 5322 and MIME standards.
 * Supports percent-encoding, UTF-8, and encoded-word decoding (RFC 2047).
 */
function parseMailtoData(mailto) {
  const [toPart, query] = mailto.replace(/^mailto:/i, '').split('?');
  const params = new URLSearchParams(query || '');

  // Basic mail fields
  const from = ''; // Typically not included in mailto but reserved for schema consistency
  const to = toPart ? decodeURIComponent(toPart) : '';
  const cc = decodeURIComponent(params.get('cc') || '');
  const bcc = decodeURIComponent(params.get('bcc') || '');

  // Subject & body decoding
  const subject = decodeMIMEHeader(params.get('subject'));
  const bodyContent = decodeMIMEBody(params.get('body'));

  // Return structured JSON schema
  return {
    from,
    to: to.split(',').map(addr => addr.trim()).filter(Boolean),
    cc: cc.split(',').map(addr => addr.trim()).filter(Boolean),
    bcc: bcc.split(',').map(addr => addr.trim()).filter(Boolean),
    subject,
    body: {
      contentType: 'text/plain',
      charset: 'utf-8',
      content: bodyContent
    },
    attachments: [],
  };
}

/**
 * Decode MIME-encoded header fields like "=?UTF-8?B?...?=" according to RFC 2047.
 */
function decodeMIMEHeader(value) {
  if (!value) return '';
  const decoded = value.replace(/=\?([^?]+)\?(B|Q)\?([^?]*)\?=/gi, (_, charset, encoding, text) => {
    try {
      if (encoding.toUpperCase() === 'B') {
        const binary = atob(text.replace(/\s/g, ''));
        return new TextDecoder(charset).decode(Uint8Array.from(binary, c => c.charCodeAt(0)));
      }
      if (encoding.toUpperCase() === 'Q') {
        const decodedText = text.replace(/_/g, ' ').replace(/=([A-F0-9]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
        return new TextDecoder(charset).decode(new TextEncoder().encode(decodedText));
      }
    } catch {
      return value;
    }
    return value;
  });
  return decodeURIComponentSafe(decoded);
}

/**
 * Decode body text safely using W3C-compliant TextDecoder and URI decoding.
 */
function decodeMIMEBody(text) {
  if (!text) return '';
  try {
    const decoded = decodeURIComponentSafe(text);
    return new TextDecoder('utf-8', { fatal: false }).decode(new TextEncoder().encode(decoded));
  } catch {
    return text;
  }
}

function decodeURIComponentSafe(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function buildComposeURL(service, data, custom) {
  // Case-insensitive lookup for custom profiles
  const customTemplate = Object.keys(custom || {}).find(key =>
    key.toLowerCase() === service.toLowerCase()
  ) ? custom[Object.keys(custom).find(key => key.toLowerCase() === service.toLowerCase())] : null;
  
  const template = customTemplate || TEMPLATES[service] || TEMPLATES.gmail;
  
  // Convert arrays to comma-separated strings for URL encoding
  const toStr = Array.isArray(data.to) ? data.to.join(',') : (data.to || '');
  const ccStr = Array.isArray(data.cc) ? data.cc.join(',') : (data.cc || '');
  const bccStr = Array.isArray(data.bcc) ? data.bcc.join(',') : (data.bcc || '');
  const subjectStr = data.subject || '';
  const bodyStr = data.body?.content || data.body || '';
  
  return template
    .replace('{{to}}', encodeURIComponent(toStr))
    .replace('{{cc}}', encodeURIComponent(ccStr))
    .replace('{{bcc}}', encodeURIComponent(bccStr))
    .replace('{{subject}}', encodeURIComponent(subjectStr))
    .replace('{{body}}', encodeURIComponent(bodyStr));
}

async function handleMailtoClick(mailto) {
  if (!mailto || typeof mailto !== 'string' || !mailto.startsWith('mailto:')) {
    console.warn('MailToWith: invalid mailto message received', mailto);
    return;
  }

  try {
    const data = parseMailtoData(mailto);
    const { service, customServices } = await getSelectedMailService();
    const normalizedService = service.toLowerCase().trim();
    const url = buildComposeURL(normalizedService, data, customServices);
    await chrome.tabs.create({ url });
  } catch (error) {
    console.error('MailToWith: failed to handle mailto click', error);
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