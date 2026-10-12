const DEFAULT_FRONTEND_URL = 'http://localhost:3100';

function getFrontendOrigins(env = process.env) {
  const configured = env.FRONTEND_URL || env.CLIENT_URL || DEFAULT_FRONTEND_URL;
  return configured
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

function getPrimaryFrontendUrl(env = process.env) {
  return getFrontendOrigins(env)[0] || DEFAULT_FRONTEND_URL;
}

module.exports = { DEFAULT_FRONTEND_URL, getFrontendOrigins, getPrimaryFrontendUrl };
