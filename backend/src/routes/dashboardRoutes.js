const express = require('express');
const controller = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.use(requireAuth);

router.get('/summary', asyncHandler(controller.summary));

module.exports = router;
