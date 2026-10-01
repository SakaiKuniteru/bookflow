import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import config from '../config/index.js';
function layKhoa() {
  const key = Buffer.from(config.env.registrationDraftKey, 'hex');
  if (key.length !== 32) throw new Error('REGISTRATION_DRAFT_KEY phải là 32 byte dạng hex');
  return key;
}
export function maHoaBanNhap(data) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', layKhoa(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(value => value.toString('base64url')).join('.');
}
export function giaiMaBanNhap(value) {
  const [ivText, tagText, encryptedText] = String(value || '').split('.');
  if (!ivText || !tagText || !encryptedText) throw new Error('Bản nháp đăng ký không hợp lệ');
  const decipher = createDecipheriv('aes-256-gcm', layKhoa(), Buffer.from(ivText, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  const plain = Buffer.concat([decipher.update(Buffer.from(encryptedText, 'base64url')), decipher.final()]);
  return JSON.parse(plain.toString('utf8'));
}