// Express 4 does not automatically forward rejected async route promises to
// error middleware. Wrap every async controller so database/provider failures
// become HTTP responses instead of unhandled rejections that stop Node.
module.exports = function asyncHandler(handler) {
  return function handledRoute(req, res, next) {
    return Promise.resolve(handler(req, res, next)).catch(next);
  };
};
