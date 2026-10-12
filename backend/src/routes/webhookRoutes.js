const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const controller = require('../controllers/webhookController');

const router = express.Router();
router.post('/resend', asyncHandler(controller.resend));
module.exports = router;
