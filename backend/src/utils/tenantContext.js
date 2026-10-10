const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

function runWithTenant(context, callback) {
  return storage.run(context, callback);
}

function currentTenant() {
  return storage.getStore();
}

module.exports = { runWithTenant, currentTenant };
