// MailToWith - Compose Preview Window
// Renders the contents of a mailto: link the way a webmail compose window would,
// then hands it off to the selected client when "Send" is clicked.

import { TEMPLATES, DISPLAY_NAMES, parseMailtoData } from './mailto.js';

const mailto = new URLSearchParams(location.search).get('mailto') || '';
const data = parseMailtoData(mailto);

const drawer = document.getElementById('drawer');
const sendMain = document.getElementById('sendMain');
const sendToggle = document.getElementById('sendToggle');
const sendLabel = document.getElementById('sendLabel');
const providerIcon = document.getElementById('providerIcon');

let profiles = {};
let selectedService = 'gmail';

/* === Header fields === */

function renderHeaders() {
  renderAddresses('to', data.to);
  renderAddresses('cc', data.cc);
  renderAddresses('bcc', data.bcc);

  const subject = document.getElementById('value-subject');
  if (data.subject) {
    subject.textContent = data.subject;
  } else {
    subject.innerHTML = '<span class="empty-value">(no subject)</span>';
  }

  document.title = data.subject ? `${data.subject} - MailToWith` : 'Message Preview - MailToWith';
}

function renderAddresses(field, list) {
  const row = document.getElementById(`field-${field}`);
  const target = document.getElementById(`value-${field}`);

  if (!list.length) {
    // Cc/Bcc rows only exist when the mailto link supplied them
    if (field !== 'to') return;
    target.innerHTML = '<span class="empty-value">(no recipient)</span>';
    return;
  }

  row.classList.remove('hidden');
  for (const addr of list) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.title = addr.name ? `${addr.name} <${addr.email}>` : addr.email;

    const avatar = document.createElement('span');
    avatar.className = 'avatar';
    avatar.textContent = (addr.name || addr.email || '?').trim().charAt(0);
    chip.appendChild(avatar);

    if (addr.name) {
      const name = document.createElement('span');
      name.className = 'chip-name';
      name.textContent = addr.name;
      chip.appendChild(name);
    }

    const email = document.createElement('span');
    email.className = 'chip-email';
    email.textContent = addr.name ? `<${addr.email}>` : addr.email;
    chip.appendChild(email);

    target.appendChild(chip);
  }
}

/* === Body === */

// RFC 6068 defines the body as text/plain, but links in the wild often carry
// markup, so render sanitized HTML when tags are actually present.
function renderBody() {
  const view = document.getElementById('body');
  const content = data.body.content;

  if (!content) {
    view.innerHTML = '<span class="empty-value">(no message body)</span>';
    return;
  }

  if (looksLikeHTML(content)) {
    view.classList.remove('plain');
    view.appendChild(sanitizeHTML(content));
    document.getElementById('footerNote').textContent = 'HTML body';
  } else {
    view.textContent = content;
    linkify(view);
  }
}

function looksLikeHTML(text) {
  return /<(a|b|br|div|em|h[1-6]|i|img|li|ol|p|span|strong|table|u|ul)\b[^>]*>/i.test(text);
}

const ALLOWED_TAGS = new Set([
  'A', 'B', 'BLOCKQUOTE', 'BR', 'CODE', 'DIV', 'EM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'HR', 'I', 'IMG', 'LI', 'OL', 'P', 'PRE', 'SPAN', 'STRONG', 'SUB', 'SUP', 'TABLE',
  'TBODY', 'TD', 'TH', 'THEAD', 'TR', 'U', 'UL'
]);
const ALLOWED_ATTRS = new Set(['href', 'src', 'alt', 'title', 'style', 'colspan', 'rowspan']);
const SAFE_URL = /^(https?:|mailto:|data:image\/)/i;

/** Build a DocumentFragment containing only allow-listed tags and attributes. */
function sanitizeHTML(html) {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const fragment = document.createDocumentFragment();
  for (const node of Array.from(parsed.body.childNodes)) {
    const clean = sanitizeNode(node);
    if (clean) fragment.appendChild(clean);
  }
  return fragment;
}

function sanitizeNode(node) {
  if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.nodeValue);
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  if (!ALLOWED_TAGS.has(node.tagName)) {
    // Drop the tag but keep whatever readable content it wrapped
    const span = document.createElement('span');
    for (const child of Array.from(node.childNodes)) {
      const clean = sanitizeNode(child);
      if (clean) span.appendChild(clean);
    }
    return span.childNodes.length ? span : null;
  }

  const element = document.createElement(node.tagName.toLowerCase());
  for (const attr of Array.from(node.attributes)) {
    const name = attr.name.toLowerCase();
    if (!ALLOWED_ATTRS.has(name)) continue;
    if ((name === 'href' || name === 'src') && !SAFE_URL.test(attr.value.trim())) continue;
    element.setAttribute(name, attr.value);
  }
  if (element.tagName === 'A') {
    element.target = '_blank';
    element.rel = 'noopener noreferrer';
  }

  for (const child of Array.from(node.childNodes)) {
    const clean = sanitizeNode(child);
    if (clean) element.appendChild(clean);
  }
  return element;
}

/** Turn bare URLs and email addresses in a plain-text body into links. */
function linkify(view) {
  const pattern = /(https?:\/\/[^\s<>()]+|[^\s<>()@]+@[^\s<>()@]+\.[a-z]{2,})/gi;
  const walker = document.createTreeWalker(view, NodeFilter.SHOW_TEXT);
  const targets = [];
  while (walker.nextNode()) targets.push(walker.currentNode);

  for (const textNode of targets) {
    const text = textNode.nodeValue;
    if (!pattern.test(text)) continue;
    pattern.lastIndex = 0;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match;
    while ((match = pattern.exec(text))) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      const link = document.createElement('a');
      link.href = match[0].includes('@') && !/^https?:/i.test(match[0]) ? `mailto:${match[0]}` : match[0];
      link.textContent = match[0];
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      fragment.appendChild(link);
      lastIndex = match.index + match[0].length;
    }
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    textNode.replaceWith(fragment);
  }
}

/* === Send split button === */

async function initSendButton() {
  const stored = await chrome.storage.sync.get(['profiles', 'selectedService']);
  profiles = stored.profiles && Object.keys(stored.profiles).length ? stored.profiles : { ...TEMPLATES };
  selectedService = stored.selectedService && profiles[stored.selectedService]
    ? stored.selectedService
    : Object.keys(profiles)[0];

  applyProvider(selectedService);
  buildDrawer();

  sendMain.addEventListener('click', () => send(selectedService));
  sendToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    drawer.classList.toggle('hidden');
  });
  document.addEventListener('click', () => drawer.classList.add('hidden'));
  document.getElementById('closeBtn').addEventListener('click', () => window.close());
}

function buildDrawer() {
  drawer.innerHTML = '';
  for (const name of Object.keys(profiles)) {
    const item = document.createElement('button');
    item.className = 'drawer-item';

    const icon = faviconElement(profiles[name]);
    if (icon) item.appendChild(icon);

    const label = document.createElement('span');
    label.textContent = displayName(name);
    item.appendChild(label);

    if (name === selectedService) {
      const tag = document.createElement('span');
      tag.className = 'default-tag';
      tag.textContent = 'default';
      item.appendChild(tag);
    }

    item.addEventListener('click', () => send(name));
    drawer.appendChild(item);
  }
}

function applyProvider(name) {
  sendLabel.textContent = `Send with ${displayName(name)}`;
  const host = templateHost(profiles[name]);
  if (host) {
    providerIcon.src = `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
    providerIcon.hidden = false;
    providerIcon.onerror = () => { providerIcon.hidden = true; };
  } else {
    providerIcon.hidden = true;
  }
}

function faviconElement(template) {
  const host = templateHost(template);
  if (!host) return null;
  const img = document.createElement('img');
  img.className = 'provider-icon';
  img.alt = '';
  img.src = `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  img.onerror = () => img.remove();
  return img;
}

function templateHost(template) {
  try {
    return new URL(template).hostname;
  } catch {
    return '';
  }
}

function displayName(name) {
  return DISPLAY_NAMES[name.toLowerCase()] || name;
}

function send(service) {
  chrome.runtime.sendMessage({ type: 'OPEN_COMPOSE', service, mailto });
  window.close();
}

renderHeaders();
renderBody();
initSendButton();
