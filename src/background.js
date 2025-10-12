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

function parseMailtoData(mailto) {
  const [toPart, query] = mailto.replace('mailto:', '').split('?');
  const params = new URLSearchParams(query);
  return {
    to: toPart || '',
    cc: params.get('cc') || '',
    bcc: params.get('bcc') || '',
    subject: params.get('subject') || '',
    body: params.get('body') || ''
  };
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
            title: `Custom: ${key}`,
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