let helmet;
try { helmet = require('helmet'); } catch (_) { helmet = null; }

module.exports = helmet ? helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}) : (_req, _res, next) => next();
