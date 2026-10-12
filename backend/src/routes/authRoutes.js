const express = require('express');
const { authRateLimit } = require('../middleware/authRateLimit');
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getRedisClient } = require('../config/redis');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

// Authentication endpoints are intentionally throttled as a group to protect
// credentials, verification mail, magic links, and password recovery.
router.use(authRateLimit({ max: 20, key: (req) => `${req.ip || 'unknown'}:${String(req.body?.email || '').toLowerCase()}` }));

const redis = getRedisClient();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  ...(redis ? { store: new RedisStore({ sendCommand: (...args) => redis.sendCommand(args), prefix: 'heymailer:rate:login:' }) } : {}),
});

router.post(
  '/signup',
  loginLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 100 }),
    body('workspaceName').optional({ checkFalsy: true }).trim().isLength({ min: 2, max: 120 }),
    body('email').isEmail(),
    body('password').isLength({ min: 8, max: 128 }),
  ],
  validate,
  asyncHandler(authController.signup)
);
router.post(
  '/login',
  loginLimiter,
  [body('email').isEmail(), body('password').isString().notEmpty()],
  validate,
  asyncHandler(authController.login)
);
router.post('/verify-email', [body('token').isString().isLength({ min: 32, max: 256 })], validate, asyncHandler(authController.verifyEmail));
router.post('/resend-verification', loginLimiter, [body('email').isEmail()], validate, asyncHandler(authController.resendVerification));
router.post('/magic-link', loginLimiter, [body('email').isEmail()], validate, asyncHandler(authController.requestMagicLink));
router.post('/magic-link/consume', [body('token').isString().isLength({ min: 32, max: 256 })], validate, asyncHandler(authController.consumeMagicLink));
router.post('/forgot-password', loginLimiter, [body('email').isEmail()], validate, asyncHandler(authController.forgotPassword));
router.post(
  '/reset-password',
  loginLimiter,
  [body('token').isString().isLength({ min: 32, max: 256 }), body('password').isLength({ min: 8, max: 128 })],
  validate,
  asyncHandler(authController.resetPassword)
);
router.post('/logout', asyncHandler(authController.logout));
router.get('/me', requireAuth, asyncHandler(authController.me));

module.exports = router;
