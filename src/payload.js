// Pure functions: the same inputs always produce the same QR content.
// Keeping these separate from the DOM makes validation easy to test.
export function phoneNumber(value) {
  const number = value.trim().replace(/[\s().-]/g, '');
  if (!/^\+[1-9]\d{6,14}$/.test(number)) throw new Error('Use an international number, for example +264812345678.');
  return number;
}

function emailAddress(value) {
  if (!/^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/.test(value)) throw new Error('Enter a valid email address.');
  return value;
}

function websiteUrl(value) {
  let url;
  try { url = new URL(/^https?:\/\//i.test(value) ? value : 'https://' + value); }
  catch { throw new Error('Enter a valid website address.'); }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.') || url.username || url.password) throw new Error('Use a public http or https website address without credentials.');
  return url.href;
}

// vCard reserves backslashes, newlines, commas and semicolons. Escaping prevents
// a name or company from injecting an additional contact field.
export const escapeVCard = value => value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');

// vCard lines fold after 75 UTF-8 bytes, without splitting Unicode characters.
function foldLine(line) {
  const encoder = new TextEncoder();
  let output = '', length = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    if (length + bytes > 75) { output += '\r\n '; length = 1; }
    output += char; length += bytes;
  }
  return output;
}

export function buildPayload(mode, input) {
  const d = Object.fromEntries(Object.entries(input).map(([k, v]) => [k, String(v).trim()]));
  const phone = ['phone', 'sms', 'whatsapp'].includes(mode) || (mode === 'contact' && d.phone) ? phoneNumber(d.phone || '') : '';
  const email = mode === 'email' || (mode === 'contact' && d.email) ? emailAddress(d.email || '') : '';
  const website = mode === 'website' || (mode === 'contact' && d.website) ? websiteUrl(d.website || '') : '';
  const message = encodeURIComponent(d.message || '');
  if (mode === 'phone') return 'tel:' + phone;
  if (mode === 'sms') return 'sms:' + phone + (message ? '?body=' + message : '');
  if (mode === 'whatsapp') return 'https://wa.me/' + phone.slice(1) + (message ? '?text=' + message : '');
  if (mode === 'email') return 'mailto:' + encodeURIComponent(email) + '?subject=' + encodeURIComponent(d.subject || '') + '&body=' + message;
  if (mode === 'website') return website;
  if (mode !== 'contact') throw new Error('Choose a supported QR type.');
  if (!d.firstName) throw new Error('Enter your first name to create a contact card.');
  if (!phone && !email) throw new Error('Add a phone number or email address to your contact.');
  const esc = escapeVCard;
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', 'N:' + esc(d.lastName || '') + ';' + esc(d.firstName) + ';;;', 'FN:' + esc([d.firstName, d.lastName].filter(Boolean).join(' '))];
  if (phone) lines.push('TEL;TYPE=CELL:' + phone);
  if (email) lines.push('EMAIL;TYPE=INTERNET:' + esc(email));
  if (d.company) lines.push('ORG:' + esc(d.company));
  if (website) lines.push('URL:' + website);
  lines.push('END:VCARD');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
