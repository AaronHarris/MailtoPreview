// MailToWith - Compose Preview Window
// Previews a mailto: link, then opens it in a webmail client on request.

const mailto = new URLSearchParams(location.search).get('mailto') || '';

const drawer = document.getElementById('drawer');
const sendMain = document.getElementById('sendMain');

const displayNames = {
  'gmail': 'Gmail',
  'outlook': 'Outlook',
  'yahoo': 'Yahoo Mail',
  'protonmail': 'ProtonMail'
};

document.addEventListener('DOMContentLoaded', async () => {
  // The background worker already knows how to parse mailto links
  renderMessage(await chrome.runtime.sendMessage({ type: 'PARSE_MAILTO', mailto }));
  await initSendButton();
});

function renderMessage(data) {
  showField('to', data.to.join(', '));
  showField('cc', data.cc.join(', '));
  showField('bcc', data.bcc.join(', '));
  showField('subject', data.subject);

  // mailto bodies are text/plain (RFC 6068), so only bare URLs become links
  linkifyURLs(data.body.content, document.getElementById('body'));

  if (data.subject) document.title = `${data.subject} - MailToWith`;
}

// Header rows only appear when the mailto link supplied them
function showField(name, value) {
  if (!value) return;
  document.getElementById(`value-${name}`).textContent = value;
  document.getElementById(`field-${name}`).classList.remove('hidden');
}

function linkifyURLs(text, container) {
  for (const part of text.split(/(https?:\/\/[^\s<>()"]+)/g)) {
    if (!part.startsWith('http')) {
      container.append(part);
      continue;
    }
    const link = document.createElement('a');
    link.href = part;
    link.textContent = part;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    container.appendChild(link);
  }
}

// Main button opens the default client; the caret opens a drawer of all profiles
async function initSendButton() {
  // The background worker already knows the saved profiles and default service
  const { service, customServices: profiles } = await chrome.runtime.sendMessage({ type: 'GET_SERVICES' });
  const selected = profiles[service] ? service : Object.keys(profiles)[0];

  document.getElementById('sendLabel').textContent = `Open in ${displayNames[selected] || selected}`;
  sendMain.prepend(providerIcon(profiles[selected]));
  for (const name of Object.keys(profiles)) {
    drawer.appendChild(drawerItem(name, profiles[name], name === selected));
  }

  sendMain.addEventListener('click', () => openIn(selected));
  document.getElementById('sendToggle').addEventListener('click', (event) => {
    event.stopPropagation();
    drawer.classList.toggle('hidden');
  });
  document.addEventListener('click', () => drawer.classList.add('hidden'));
  document.getElementById('closeBtn').addEventListener('click', () => window.close());
}

function drawerItem(name, template, isDefault) {
  const item = document.createElement('button');
  item.className = 'drawer-item';
  item.append(providerIcon(template), displayNames[name] || name);

  if (isDefault) {
    const tag = document.createElement('span');
    tag.className = 'default-tag';
    tag.textContent = 'default';
    item.appendChild(tag);
  }

  item.addEventListener('click', () => openIn(name));
  return item;
}

// Provider logo, taken from the host of that profile's compose template
function providerIcon(template) {
  let host = '';
  try {
    host = new URL(template).hostname;
  } catch {
    // A profile without a usable URL simply gets no logo
  }

  const img = document.createElement('img');
  img.className = 'provider-icon';
  img.alt = '';
  img.onerror = () => img.remove();
  img.src = `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  return img;
}

function openIn(service) {
  chrome.runtime.sendMessage({ type: 'OPEN_COMPOSE', service, mailto });
  window.close();
}
