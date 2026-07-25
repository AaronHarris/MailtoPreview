// MailToWith - Shared mailto: parsing helpers (RFC 6068)
// Used by both the background service worker and the compose preview window.

export const TEMPLATES = {
  gmail: 'https://mail.google.com/mail/?view=cm&fs=1&to={{to}}&cc={{cc}}&bcc={{bcc}}&su={{subject}}&body={{body}}',
  outlook: 'https://outlook.live.com/mail/0/deeplink/compose?to={{to}}&cc={{cc}}&bcc={{bcc}}&subject={{subject}}&body={{body}}',
  yahoo: 'https://compose.mail.yahoo.com/?to={{to}}&cc={{cc}}&bcc={{bcc}}&subject={{subject}}&body={{body}}',
  protonmail: 'https://mail.proton.me/u/0/compose?to={{to}}&cc={{cc}}&bcc={{bcc}}&subject={{subject}}&body={{body}}'
};

export const DISPLAY_NAMES = {
  gmail: 'Gmail',
  outlook: 'Outlook',
  yahoo: 'Yahoo Mail',
  protonmail: 'ProtonMail'
};

/**
 * Parse a mailto URL into structured fields following RFC 6068 / RFC 5322.
 * Addresses become { name, email } records so they can be displayed nicely.
 */
export function parseMailtoData(mailto) {
  const raw = String(mailto || '').replace(/^mailto:/i, '');
  const queryIndex = raw.indexOf('?');
  const toPart = queryIndex === -1 ? raw : raw.slice(0, queryIndex);
  const params = new URLSearchParams(queryIndex === -1 ? '' : raw.slice(queryIndex + 1));

  // RFC 6068: addresses in the path are merged with any "to" header fields
  const to = splitAddresses(decodeURIComponentSafe(toPart));
  for (const value of params.getAll('to')) to.push(...splitAddresses(value));

  const cc = params.getAll('cc').flatMap(splitAddresses);
  const bcc = params.getAll('bcc').flatMap(splitAddresses);

  return {
    from: '', // Not part of mailto, kept for schema consistency
    to,
    cc,
    bcc,
    subject: decodeMIMEHeader(params.get('subject')),
    body: {
      contentType: 'text/plain',
      charset: 'utf-8',
      content: params.get('body') || ''
    },
    attachments: []
  };
}

/**
 * Split an address list on commas that are not inside quotes or angle brackets,
 * then parse each entry into { name, email }.
 */
export function splitAddresses(value) {
  if (!value) return [];
  const parts = [];
  let current = '';
  let inQuotes = false;
  let inAngles = false;

  for (const char of value) {
    if (char === '"') inQuotes = !inQuotes;
    else if (char === '<') inAngles = true;
    else if (char === '>') inAngles = false;

    if ((char === ',' || char === ';') && !inQuotes && !inAngles) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);

  return parts.map(parseAddress).filter(addr => addr.email || addr.name);
}

function parseAddress(entry) {
  const text = decodeMIMEHeader(entry).trim();
  const angled = text.match(/^(.*?)\s*<([^>]*)>\s*$/);
  if (angled) {
    return { name: angled[1].trim().replace(/^"|"$/g, ''), email: angled[2].trim() };
  }
  return { name: '', email: text };
}

/** Render an address record the way a webmail client would. */
export function formatAddress(addr) {
  if (!addr.name) return addr.email;
  const name = /[,;<>"]/.test(addr.name) ? `"${addr.name.replace(/"/g, '')}"` : addr.name;
  return `${name} <${addr.email}>`;
}

/** Comma-separated address list for compose URLs. */
export function joinAddresses(list) {
  return (list || []).map(formatAddress).join(', ');
}

/**
 * Decode MIME-encoded header fields like "=?UTF-8?B?...?=" according to RFC 2047.
 */
export function decodeMIMEHeader(value) {
  if (!value) return '';
  const decoded = value.replace(/=\?([^?]+)\?(B|Q)\?([^?]*)\?=/gi, (match, charset, encoding, text) => {
    try {
      if (encoding.toUpperCase() === 'B') {
        const binary = atob(text.replace(/\s/g, ''));
        return new TextDecoder(charset).decode(Uint8Array.from(binary, c => c.charCodeAt(0)));
      }
      const decodedText = text.replace(/_/g, ' ').replace(/=([A-F0-9]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
      return new TextDecoder(charset).decode(new TextEncoder().encode(decodedText));
    } catch {
      return match;
    }
  });
  return decodeURIComponentSafe(decoded);
}

export function decodeURIComponentSafe(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Case-insensitive lookup of a profile template, falling back to the built-ins. */
export function resolveTemplate(service, custom) {
  const key = Object.keys(custom || {}).find(name => name.toLowerCase() === String(service).toLowerCase());
  return (key && custom[key]) || TEMPLATES[String(service).toLowerCase()] || TEMPLATES.gmail;
}

export function buildComposeURL(service, data, custom) {
  const template = resolveTemplate(service, custom);
  const bodyStr = data.body?.content ?? data.body ?? '';

  return template
    .replace('{{to}}', encodeURIComponent(joinAddresses(data.to)))
    .replace('{{cc}}', encodeURIComponent(joinAddresses(data.cc)))
    .replace('{{bcc}}', encodeURIComponent(joinAddresses(data.bcc)))
    .replace('{{subject}}', encodeURIComponent(data.subject || ''))
    .replace('{{body}}', encodeURIComponent(bodyStr));
}
