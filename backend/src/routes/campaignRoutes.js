const express = require('express');
const controller = require('../controllers/campaignController');
const placementController = require('../controllers/placementController');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.use(requireAuth);

router.get('/', asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.getOne));
router.get('/:id/placement', asyncHandler(placementController.list));
router.post('/', asyncHandler(controller.create));
router.put('/:id', asyncHandler(controller.update));
router.delete('/:id', asyncHandler(controller.remove));

router.post('/resolve-recipients', asyncHandler(controller.resolveRecipientPreview));
router.post('/send-test', asyncHandler(controller.sendTest));
router.post('/:id/send', asyncHandler(controller.startSend));
router.post('/:id/placement', asyncHandler(placementController.create));
router.post('/:id/cancel', asyncHandler(controller.cancelSend));

module.exports = router;
