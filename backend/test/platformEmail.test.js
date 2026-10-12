const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePlatformSettings } = require('../src/services/platformEmail');

test('Resend rejects public mailbox domains as sender addresses', () => {
  assert.throws(
    () => validatePlatformSettings({ mailProvider: 'resend', senderEmail: 'team@gmail.com' }),
    /domain verified in Resend/
  );
});

test('Resend accepts a sender on a custom verified-domain candidate', () => {
  const settings = { mailProvider: 'resend', senderEmail: 'mail@heymailer.example' };
  assert.equal(validatePlatformSettings(settings), settings);
});
