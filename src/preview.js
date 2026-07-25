// MailToWith - Compose Preview Window
// Previews a mailto: link, then opens it in a webmail client on request.

const mailto = new URLSearchParams(location.search).get('mailto') || '';

const drawer = document.getElementById('drawer');
const sendLabel = document.getElementById('sendLabel');
const providerIcon = document.getElementById('providerIcon');

const displayNames = {
  'gmail': 'Gmail',
  'outlook': 'Outlook',
  'yahoo': 'Yahoo Mail',
  'protonmail': 'ProtonMail'
};

document.addEventListener('DOMContentLoaded', async () => {
  const data = await chrome.runtime.sendMessage({ type: 'PARSE_MAILTO', mailto });
  renderMessage(data);
  await initSendButton();
});

function renderMessage(data) {
  showField('to', data.to.join(', '));
  showField('cc', data.cc.join(', '));
  showField('bcc', data.bcc.join(', '));
  showField('subject', data.subject);

  // mailto bodies are text/plain (RFC 6068), so only bare URLs become links
  const body = document.getElementById('body');
  body.textContent = data.body.content;
  linkifyURLs(body);

  if (data.subject) document.title = `${data.subject} - MailToWith`;
}

// Header rows only appear when the mailto link supplied them
function showField(name, value) {
  if (!value) return;
  document.getElementById(`value-${name}`).textContent = value;
  document.getElementById(`field-${name}`).classList.remove('hidden');
}

// Wraps bare http(s) URLs in the body text with anchors
function linkifyURLs(container) {
  const text = container.textContent;
  const pattern = /https?:\/\/[^\s<>()"]+/g;
  if (!pattern.test(text)) return;
  pattern.lastIndex = 0;

  const fragment = document.createDocumentFragment();
  let lastIndex = 0;
  let match;
  while ((match = pattern.exec(text))) {
    fragment.append(text.slice(lastIndex, match.index));
    const link = document.createElement('a');
    link.href = match[0];
    link.textContent = match[0];
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    fragment.appendChild(link);
    lastIndex = match.index + match[0].length;
  }
  fragment.append(text.slice(lastIndex));

  container.textContent = '';
  container.appendChild(fragment);
}

// Main button opens the default client; the caret opens a drawer of all profiles
async function initSendButton() {
  const stored = await chrome.storage.sync.get(['profiles', 'selectedService']);
  const profiles = stored.profiles && Object.keys(stored.profiles).length ? stored.profiles : {
    "gmail": "https://mail.google.com/mail/?view=cm&fs=1&to={{to}}&cc={{cc}}&bcc={{bcc}}&su={{subject}}&body={{body}}",
    "outlook": "https://outlook.live.com/mail/0/deeplink/compose?to={{to}}&cc={{cc}}&bcc={{bcc}}&subject={{subject}}&body={{body}}",
    "yahoo": "https://compose.mail.yahoo.com/?to={{to}}&cc={{cc}}&bcc={{bcc}}&subject={{subject}}&body={{body}}",
    "protonmail": "https://mail.proton.me/u/0/compose?to={{to}}&cc={{cc}}&bcc={{bcc}}&subject={{subject}}&body={{body}}"
  };
  // The default is whatever the user saved in the extension settings
  const selected = profiles[stored.selectedService] ? stored.selectedService : Object.keys(profiles)[0];

  sendLabel.textContent = `Open in ${displayNames[selected] || selected}`;
  const icon = favicon(profiles[selected]);
  if (icon) {
    providerIcon.src = icon;
    providerIcon.hidden = false;
    providerIcon.onerror = () => { providerIcon.hidden = true; };
  }

  for (const name of Object.keys(profiles)) {
    const item = document.createElement('button');
    item.className = 'drawer-item';

    const url = favicon(profiles[name]);
    if (url) {
      const img = document.createElement('img');
      img.className = 'provider-icon';
      img.alt = '';
      img.src = url;
      img.onerror = () => img.remove();
      item.appendChild(img);
    }

    const label = document.createElement('span');
    label.textContent = displayNames[name] || name;
    item.appendChild(label);

    if (name === selected) {
      const tag = document.createElement('span');
      tag.className = 'default-tag';
      tag.textContent = 'default';
      item.appendChild(tag);
    }

    item.addEventListener('click', () => send(name));
    drawer.appendChild(item);
  }

  document.getElementById('sendMain').addEventListener('click', () => send(selected));
  document.getElementById('sendToggle').addEventListener('click', (event) => {
    event.stopPropagation();
    drawer.classList.toggle('hidden');
  });
  document.addEventListener('click', () => drawer.classList.add('hidden'));
  document.getElementById('closeBtn').addEventListener('click', () => window.close());
}

// Provider logo, pulled from the host in that profile's compose template
function favicon(template) {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(template).hostname}&sz=64`;
  } catch {
    return '';
  }
}

function send(service) {
  chrome.runtime.sendMessage({ type: 'OPEN_COMPOSE', service, mailto });
  window.close();
}
