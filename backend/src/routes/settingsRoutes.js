const express = require('express');
const controller = require('../controllers/settingsController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', controller.get);
router.put('/', controller.update);
router.delete('/smtp-password', controller.clearSmtpPassword);
router.post('/test-smtp', controller.testSmtp);
router.post('/test-email', controller.sendTestEmail);

module.exports = router;
