const express = require('express');
const controller = require('../controllers/settingsController');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.use(requireAuth);

router.get('/', asyncHandler(controller.get));
router.put('/', asyncHandler(controller.update));
router.delete('/smtp-password', asyncHandler(controller.clearSmtpPassword));
router.post('/test-provider', asyncHandler(controller.testSmtp));
router.post('/test-smtp', asyncHandler(controller.testSmtp));
router.post('/test-email', asyncHandler(controller.sendTestEmail));

module.exports = router;
