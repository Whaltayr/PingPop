import QRCode from 'qrcode';
import { buildPayload } from './payload.js';
import './style.css';

const $ = selector => document.querySelector(selector);
const form = $('#details');
const modes = ['contact', 'whatsapp', 'phone', 'email', 'sms', 'website'];
const colors = ['#17201b', '#173f8a', '#6b2469', '#000000'];
const storageKey = 'pingpop-draft-v1';
let mode = 'contact', revision = 0, current = null, photoUrl = null;
const messages = { contact: 'SAVE MY CONTACT', whatsapp: 'CHAT ON WHATSAPP', phone: 'CALL ME', email: 'SEND AN EMAIL', sms: 'SEND A TEXT', website: 'VISIT MY WEBSITE' };
const controls = ['#png', '#svg', '#copy', '#vcf'];
const readDetails = () => Object.fromEntries(new FormData(form));

function notify(message) { $('#feedback').textContent = message; }

// Storage is opt-in. Never store a draft just because somebody typed a number.
// localStorage is not encrypted: avoid enabling this on a shared computer.
function saveDraft() {
  try {
    const allDetails = Object.fromEntries([...form.querySelectorAll('[name]')].map(input => [input.name, input.value]));
    if ($('#remember').checked) localStorage.setItem(storageKey, JSON.stringify({ mode, color: $('#color').value, details: allDetails }));
    else localStorage.removeItem(storageKey);
  } catch { notify('Browser storage is unavailable. You can still download your QR.'); }
}

function switchMode(next) {
  mode = next;
  document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
  document.querySelectorAll('[data-for]').forEach(label => {
    const visible = label.dataset.for.split(' ').includes(mode);
    label.hidden = !visible;
    // Hidden controls are disabled so they do not enter FormData for other modes.
    label.querySelectorAll('input,textarea').forEach(input => { input.disabled = !visible; });
  });
  $('#phone-required').textContent = mode === 'contact' ? '(or email)' : '*';
  $('#email-required').textContent = mode === 'email' ? '*' : '(or phone)';
  $('#website-required').textContent = mode === 'website' ? '*' : '';
  $('#vcf').hidden = mode !== 'contact';
  $('#type-label').textContent = mode === 'contact' ? 'CONTACT CARD' : mode.toUpperCase();
  $('#scan-label').textContent = 'SCAN TO ' + messages[mode];
  void render();
}

async function render() {
  // Invalidate earlier asynchronous renders immediately. A slow QR render may
  // never overwrite newer input or leave an old downloadable QR on screen.
  const version = ++revision;
  current = null;
  controls.forEach(id => { $(id).disabled = true; });
  $('#qr').hidden = true;
  $('#empty-qr').hidden = false;
  $('#validation').textContent = '';
  notify('');
  const details = readDetails();
  const name = [details.firstName, details.lastName].filter(Boolean).join(' ').trim();
  const title = mode === 'contact' ? name : mode === 'website' ? details.website : mode === 'email' ? details.email : details.phone;
  // textContent, not innerHTML, keeps user-entered markup inert.
  $('#preview-title').textContent = title || 'Your next hello';
  $('#preview-subtitle').textContent = (mode === 'contact' ? details.company || details.phone || details.email : details.subject || details.message) || 'A little square. A new connection.';
  $('#avatar').textContent = (name || 'P').slice(0, 1).toUpperCase();
  saveDraft();
  try {
    const payload = buildPayload(mode, details);
    const options = { errorCorrectionLevel: 'M', margin: 4, width: 1024, color: { dark: $('#color').value, light: '#ffffff' } };
    const [png, svg] = await Promise.all([QRCode.toDataURL(payload, options), QRCode.toString(payload, { ...options, type: 'svg' })]);
    if (version !== revision) return;
    current = { payload, png, svg, mode };
    $('#qr').src = png;
    $('#qr').hidden = false;
    $('#empty-qr').hidden = true;
    controls.forEach(id => { $(id).disabled = false; });
  } catch (error) {
    if (version !== revision) return;
    $('#validation').textContent = error instanceof Error ? error.message : 'Could not generate this QR code.';
  }
}

function download(content, type, extension) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = 'pingpop-' + mode + '.' + extension;
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify('Download started. Scan your QR to check it before sharing.');
}

form.addEventListener('submit', event => event.preventDefault());
form.addEventListener('input', event => { if (event.target.id !== 'photo') void render(); });
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => switchMode(button.dataset.mode)));
$('#png').addEventListener('click', () => {
  if (!current) return;
  const anchor = document.createElement('a');
  anchor.href = current.png; anchor.download = 'pingpop-' + mode + '.png';
  document.body.append(anchor); anchor.click(); anchor.remove(); notify('PNG downloaded. Test it with your phone camera.');
});
$('#svg').addEventListener('click', () => { if (current) download(current.svg, 'image/svg+xml', 'svg'); });
$('#vcf').addEventListener('click', () => { if (current?.mode === 'contact') download(current.payload, 'text/vcard;charset=utf-8', 'vcf'); });
$('#copy').addEventListener('click', async () => {
  if (!current) return;
  try { await navigator.clipboard.writeText(current.payload); notify('QR content copied.'); }
  catch { notify('Clipboard access was blocked. Use a download instead.'); }
});

function clearPhoto() {
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = null; $('#photo').value = ''; $('#avatar-image').removeAttribute('src');
  $('#avatar-image').hidden = true; $('#avatar').hidden = false; $('#remove-photo').hidden = true;
}
$('#remove-photo').addEventListener('click', clearPhoto);
$('#photo').addEventListener('change', () => {
  const file = $('#photo').files[0];
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
    $('#photo').value = ''; notify('Choose a PNG, JPEG or WebP image smaller than 2 MB.'); return;
  }
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = URL.createObjectURL(file);
  $('#avatar-image').onerror = () => { clearPhoto(); notify('This image could not be opened. Choose another file.'); };
  $('#avatar-image').src = photoUrl; $('#avatar-image').hidden = false;
  $('#avatar').hidden = true; $('#remove-photo').hidden = false;
  notify('Photo is preview-only; it is not embedded in QR or contact downloads.');
});
$('#clear').addEventListener('click', () => {
  form.reset(); clearPhoto(); $('#remember').checked = false;
  switchMode('contact'); notify('Details cleared from this device.');
});

// Only restore recognised fields and choices from the browser's untrusted storage.
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
  if (saved && typeof saved.details === 'object' && saved.details) {
    for (const input of form.querySelectorAll('[name]')) {
      if (typeof saved.details[input.name] === 'string') input.value = saved.details[input.name].slice(0, input.maxLength);
    }
    if (modes.includes(saved.mode)) mode = saved.mode;
    if (colors.includes(saved.color)) $('#color').value = saved.color;
    $('#remember').checked = true;
  }
} catch { /* Invalid or inaccessible storage must not prevent QR generation. */ }
switchMode(mode);
