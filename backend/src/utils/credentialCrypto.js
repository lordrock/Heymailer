const crypto = require('crypto');

const PREFIX = 'enc:v1';

function encryptionKey() {
  const secret = process.env.SMTP_CREDENTIALS_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'SMTP_CREDENTIALS_ENCRYPTION_KEY must be at least 32 characters (JWT_SECRET is used as a fallback).'
    );
  }
  return crypto.createHash('sha256').update(secret).digest();
}

function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(`${PREFIX}:`);
}

function encryptSecret(value) {
  if (!value) return '';
  if (isEncrypted(value)) return value;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [PREFIX, iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join(':');
}

function decryptSecret(value) {
  if (!value || !isEncrypted(value)) return value || '';

  const parts = value.split(':');
  if (parts.length !== 5) throw new Error('Stored SMTP credential has an invalid encrypted format.');

  const iv = Buffer.from(parts[2], 'base64url');
  const tag = Buffer.from(parts[3], 'base64url');
  const encrypted = Buffer.from(parts[4], 'base64url');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

module.exports = { encryptSecret, decryptSecret, isEncrypted };
