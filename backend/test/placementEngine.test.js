const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyPlacement, placementMetrics } = require('../src/services/placementEngine');

test('classifies Gmail category and spam labels', () => {
  assert.equal(classifyPlacement('gmail', { path: 'INBOX' }, new Set(['\\Inbox', 'CATEGORY_PROMOTIONS'])), 'promotions');
  assert.equal(classifyPlacement('gmail', { path: 'INBOX' }, new Set(['\\Inbox', 'CATEGORY_PERSONAL'])), 'primary');
  assert.equal(classifyPlacement('gmail', { path: '[Gmail]/Spam' }, new Set(['\\Spam'])), 'spam');
});

test('classifies standard provider inbox and junk folders', () => {
  assert.equal(classifyPlacement('outlook', { path: 'Inbox' }), 'inbox');
  assert.equal(classifyPlacement('yahoo', { path: 'Bulk Mail' }), 'spam');
  assert.equal(classifyPlacement('custom', { path: 'Archive' }), 'other');
});

test('placement metrics keep pending separate and calculate a settled estimate', () => {
  const metrics = placementMetrics({ results: [
    { provider: 'gmail', status: 'found', placement: 'primary' },
    { provider: 'gmail', status: 'found', placement: 'promotions' },
    { provider: 'outlook', status: 'found', placement: 'spam' },
    { provider: 'yahoo', status: 'missing', placement: 'missing' },
    { provider: 'aol', status: 'pending', placement: 'pending' },
  ] });
  assert.equal(metrics.total, 5);
  assert.equal(metrics.inbox, 2);
  assert.equal(metrics.pending, 1);
  assert.equal(metrics.estimatedInboxPercentage, 50);
  assert.equal(metrics.providers.gmail.promotions, 1);
});
