const test = require('node:test');
const assert = require('node:assert/strict');
const { getFrontendOrigins, getPrimaryFrontendUrl } = require('../src/config/frontendUrl');

test('FRONTEND_URL is canonical and supports a comma-separated CORS allow-list', () => {
  const env = {
    FRONTEND_URL: 'https://app.heymailer.example/, https://preview.heymailer.example',
    CLIENT_URL: 'https://legacy.invalid',
  };

  assert.deepEqual(getFrontendOrigins(env), [
    'https://app.heymailer.example',
    'https://preview.heymailer.example',
  ]);
  assert.equal(getPrimaryFrontendUrl(env), 'https://app.heymailer.example');
});

test('legacy CLIENT_URL remains supported during deployment migration', () => {
  assert.equal(getPrimaryFrontendUrl({ CLIENT_URL: 'https://legacy.heymailer.example/' }), 'https://legacy.heymailer.example');
});

test('local development has a safe default', () => {
  assert.equal(getPrimaryFrontendUrl({}), 'http://localhost:3100');
});
