// MailToWith - Background Service Worker
// Handles mailto link redirect to chosen webmail client

const TEMPLATES = {
  gmail: 'https://mail.google.com/mail/?view=cm&fs=1&to={{to}}&cc={{cc}}&bcc={{bcc}}&su={{subject}}&body={{body}}',
  outlook: 'https://outlook.live.com/mail/0/deeplink/compose?to={{to}}&cc={{cc}}&bcc={{bcc}}&subject={{subject}}&body={{body}}',
  yahoo: 'https://compose.mail.yahoo.com/?to={{to}}&cc={{cc}}&bcc={{bcc}}&subject={{subject}}&body={{body}}',
  protonmail: 'https://mail.proton.me/u/0/compose?to={{to}}&cc={{cc}}&bcc={{bcc}}&subject={{subject}}&body={{body}}'
};

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'mailto') {
    port.onMessage.addListener((message) => {
      if (message.type === 'MAILTO_CLICK') {
        handleMailtoClick(message.mailto);
      }
    });
  }
});

async function getSelectedMailService() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['selectedService', 'customServices'], (data) => {
      const service = data.selectedService || 'gmail';
      resolve({ service, customServices: data.customServices || {} });
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
  const template = custom?.[service] || TEMPLATES[service] || TEMPLATES.gmail;
  return template
    .replace('{{to}}', encodeURIComponent(data.to))
    .replace('{{cc}}', encodeURIComponent(data.cc))
    .replace('{{bcc}}', encodeURIComponent(data.bcc))
    .replace('{{subject}}', encodeURIComponent(data.subject))
    .replace('{{body}}', encodeURIComponent(data.body));
}

async function handleMailtoClick(mailto) {
  if (!mailto || typeof mailto !== 'string' || !mailto.startsWith('mailto:')) {
    console.warn('MailToWith: invalid mailto message received', mailto);
    return;
  }

  try {
    const data = parseMailtoData(mailto);
    const { service, customServices } = await getSelectedMailService();
    const url = buildComposeURL(service, data, customServices);
    await chrome.tabs.create({ url });
  } catch (error) {
    console.error('MailToWith: failed to handle mailto click', error);
  }
}

// Initialize default values when first installed
chrome.runtime.onInstalled.addListener(async () => {
  chrome.storage.sync.get(['selectedService', 'customServices'], async (data) => {
    if (!data.selectedService) {
      chrome.storage.sync.set({
        selectedService: 'gmail',
        customServices: {},
        version: '1.0.0'
      });
    }

    // Remove old menu items to prevent duplication
    chrome.contextMenus.removeAll(() => {
      // Root menu
      chrome.contextMenus.create({
        id: 'rootMailToWith',
        title: 'Open in MailToWith',
        contexts: ['link'],
        targetUrlPatterns: ['mailto:*']
      });

      const services = ['gmail', 'outlook', 'yahoo', 'protonmail'];
      const customServices = data.customServices || {};

      // Create submenu entries for default and custom providers
      for (const service of services) {
        chrome.contextMenus.create({
          id: `mailto-${service}`,
          parentId: 'rootMailToWith',
          title: service.charAt(0).toUpperCase() + service.slice(1),
          contexts: ['link'],
          targetUrlPatterns: ['mailto:*']
        });
      }

      if (customServices && Object.keys(customServices).length > 0) {
        for (const key of Object.keys(customServices)) {
          chrome.contextMenus.create({
            id: `mailto-custom-${key}`,
            parentId: 'rootMailToWith',
            title: `${key}`,
            contexts: ['link'],
            targetUrlPatterns: ['mailto:*']
          });
        }
      }
    });
  });
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