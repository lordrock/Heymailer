const test = require('node:test');
const assert = require('node:assert/strict');
const { renderAuthEmail } = require('../src/templates/authEmail');

test('auth email uses HeyMailer branding and escapes user-controlled content', () => {
  const html = renderAuthEmail({
    eyebrow: 'Security',
    title: 'Verify email',
    greeting: '<script>alert(1)</script>',
    body: 'Continue securely.',
    buttonLabel: 'Verify',
    url: 'https://app.heymailer.example/auth/verify-email?token=a&next=b',
    expiry: 'Expires soon.',
    securityNote: 'Ignore if unexpected.',
  });

  assert.match(html, /HeyMailer/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /token=a&amp;next=b/);
});
