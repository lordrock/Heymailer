const express = require('express');
const controller = require('../controllers/publicController');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

// Truly public — this is the link recipients click from their inbox.
router.get('/unsubscribe', asyncHandler(controller.unsubscribe));
router.post('/unsubscribe', asyncHandler(controller.unsubscribe));

// Variable list only needs an admin session (used by the composer).
router.get('/variables', requireAuth, asyncHandler(controller.variables));

module.exports = router;
