const express = require('express');
const controller = require('../controllers/publicController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Truly public — this is the link recipients click from their inbox.
router.get('/unsubscribe', controller.unsubscribe);

// Variable list only needs an admin session (used by the composer).
router.get('/variables', requireAuth, controller.variables);

module.exports = router;
