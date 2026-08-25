function notFound(req, res, next) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('[error]', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message, errors: err.errors });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ message: `A record with that ${field} already exists.` });
  }

  const status = err.status || 500;
  res.status(status).json({
    message: status === 500 ? 'Something went wrong on our end.' : err.message,
  });
}

module.exports = { notFound, errorHandler };
