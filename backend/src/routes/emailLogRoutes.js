const express = require('express');
const controller = require('../controllers/emailLogController');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.use(requireAuth);

router.get('/', asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.getOne));

module.exports = router;
