const express = require('express');
const controller = require('../controllers/draftController');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.use(requireAuth);

router.get('/', asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.getOne));
router.post('/', asyncHandler(controller.upsert));
router.put('/:id', asyncHandler(controller.upsert));
router.delete('/:id', asyncHandler(controller.remove));

module.exports = router;
