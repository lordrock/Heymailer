const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-jwt-secret-that-is-long-enough';
process.env.UNSUBSCRIBE_SECRET = 'test-only-unsubscribe-secret-long-enough';

const app = require('../src/app');

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

test.after(async () => {
  server.closeAllConnections?.();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('health endpoint reports a degraded dependency when MongoDB is disconnected', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.status, 'degraded');
  assert.equal(body.service, 'heymailer-api');
  assert.equal(body.database, 'down');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
});

test('CORS rejects origins outside FRONTEND_URL', async () => {
  const response = await fetch(`${baseUrl}/api/health`, {
    headers: { Origin: 'https://attacker.example' },
  });

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { message: 'Origin is not allowed by CORS: https://attacker.example' });
});

test('magic-link endpoint accepts only a valid email payload', async () => {
  const response = await fetch(`${baseUrl}/api/auth/magic-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'not-an-email' }),
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.message, 'Please check the highlighted fields.');
});

test('magic-link endpoint reports unavailable platform mail before claiming delivery', async () => {
  const response = await fetch(`${baseUrl}/api/auth/magic-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'person@example.com' }),
  });
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.code, 'MAIL_NOT_CONFIGURED');
  assert.match(body.message, /sender email is not configured/i);
});
