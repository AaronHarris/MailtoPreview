// MailToWith - Compose Preview Window
// Previews a mailto: link, then opens it in the webmail client of your choice.

const mailto = new URLSearchParams(location.search).get('mailto') || '';

const drawer = document.getElementById('drawer');
const sendMain = document.getElementById('sendMain');

let displayNames = {}; // provider labels, sent over by the background worker

document.addEventListener('DOMContentLoaded', async () => {
  // The background worker owns the mailto parsing and the saved profiles
  const preview = await chrome.runtime.sendMessage({ type: 'PREVIEW_DATA', mailto });
  displayNames = preview.displayNames;

  renderMessage(preview.data);
  initSendButton(preview.service, preview.profiles);
  document.getElementById('closeBtn').addEventListener('click', () => window.close());
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
  // Splitting on a capturing group alternates plain text and matched URLs
  text.split(/(https?:\/\/[^\s<>()"]+)/).forEach((part, index) => {
    if (index % 2 === 0) {
      container.append(part);
      return;
    }

    const link = document.createElement('a');
    link.href = part;
    link.textContent = part;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    container.appendChild(link);
  });
}

// The main button opens the default client; the caret opens a drawer of all of them
function initSendButton(service, profiles) {
  const selected = profiles[service] ? service : Object.keys(profiles)[0];

  document.getElementById('sendLabel').textContent = `Open in ${displayNames[selected] || selected}`;
  sendMain.prepend(providerIcon(profiles[selected]));
  sendMain.addEventListener('click', () => openIn(selected));

  for (const name of Object.keys(profiles)) {
    drawer.appendChild(drawerItem(name, profiles[name], name === selected));
  }

  document.getElementById('sendToggle').addEventListener('click', (event) => {
    event.stopPropagation();
    drawer.classList.toggle('hidden');
  });
  document.addEventListener('click', () => drawer.classList.add('hidden'));
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
