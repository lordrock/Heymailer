function notFound(req, res, next) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.name === 'ValidationError') {
    console.warn(`[request] ${req.method} ${req.originalUrl} validation failed: ${err.message}`);
    return res.status(400).json({ message: err.message, errors: err.errors });
  }

  if (err.code === 11000) {
    console.warn(`[request] ${req.method} ${req.originalUrl} duplicate key:`, err.keyValue);
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    if (field === 'email' && req.originalUrl.startsWith('/api/contacts')) {
      return res.status(409).json({
        message: `A contact with the email ${err.keyValue.email} already exists. Edit the existing contact or add it to another group.`,
        code: 'CONTACT_EMAIL_EXISTS',
        field: 'email',
      });
    }
    return res.status(409).json({ message: `A record with that ${field} already exists.` });
  }

  const status = err.status || 500;
  if (status >= 500) console.error('[error]', err);
  else console.warn(`[request] ${req.method} ${req.originalUrl} failed (${status}): ${err.message}`);
  res.status(status).json({
    message: status === 500 ? 'Something went wrong on our end.' : err.message,
  });
}

module.exports = { notFound, errorHandler };
