const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  '/login',
  loginLimiter,
  [body('email').isEmail(), body('password').isString().notEmpty()],
  validate,
  asyncHandler(authController.login)
);
router.post('/logout', asyncHandler(authController.logout));
router.get('/me', requireAuth, asyncHandler(authController.me));

module.exports = router;
