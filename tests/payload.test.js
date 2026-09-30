import test from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import { buildPayload, escapeVCard, phoneNumber } from '../src/payload.js';

test('international phone validation and normalisation', () => {
  assert.equal(phoneNumber('+264 (81) 234-5678'), '+264812345678');
  for (const phone of ['0812345678', '+0123456789', '+264bad', '+1']) assert.throws(() => phoneNumber(phone));
});
test('contact card includes both phone and email', () => {
  const card = buildPayload('contact', { firstName: 'João', lastName: 'Dala', phone: '+264812345678', email: 'joao@example.com' });
  assert.match(card, /FN:João Dala\r\n/); assert.match(card, /TEL;TYPE=CELL:\+264812345678/); assert.match(card, /EMAIL;TYPE=INTERNET:joao@example.com/);
  assert.ok(card.endsWith('END:VCARD\r\n'));
});
test('vCard escapes field injection and delimiters', () => {
  assert.equal(escapeVCard('A;B,C\nTEL:123'), 'A\\;B\\,C\\nTEL:123');
  const card = buildPayload('contact', { firstName: 'A\nTEL:evil', phone: '+264812345678' });
  assert.ok(!card.includes('\r\nTEL:evil'));
});
test('vCard folds Unicode lines to 75 bytes', () => {
  const card = buildPayload('contact', { firstName: 'é'.repeat(60), email: 'a@example.com' });
  assert.ok(card.split('\r\n').every(line => Buffer.byteLength(line) <= 75));
});
test('all link types encode messages safely', () => {
  assert.equal(buildPayload('phone', { phone: '+264812345678' }), 'tel:+264812345678');
  assert.equal(buildPayload('whatsapp', { phone: '+264812345678', message: 'Hi & hello' }), 'https://wa.me/264812345678?text=Hi%20%26%20hello');
  assert.equal(buildPayload('sms', { phone: '+264812345678', message: 'Hi' }), 'sms:+264812345678?body=Hi');
  assert.equal(buildPayload('email', { email: 'a@example.com', subject: 'Hello & welcome' }), 'mailto:a%40example.com?subject=Hello%20%26%20welcome&body=');
  assert.equal(buildPayload('website', { website: 'example.com' }), 'https://example.com/');
});
test('invalid and missing details are rejected', () => {
  assert.throws(() => buildPayload('email', { email: 'bad' }));
  assert.throws(() => buildPayload('contact', { firstName: 'Me' }));
  assert.throws(() => buildPayload('website', { website: 'javascript:alert(1)' }));
  assert.throws(() => buildPayload('website', { website: 'https://user:password@example.com' }));
});
test('real QR library generates PNG and SVG for a contact', async () => {
  const card = buildPayload('contact', { firstName: 'Alex', phone: '+264812345678' });
  assert.match(await QRCode.toDataURL(card), /^data:image\/png;base64,/);
  assert.match(await QRCode.toString(card, { type: 'svg' }), /<svg/);
});
