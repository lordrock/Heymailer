const express = require('express');
const controller = require('../controllers/adminDeliverabilityController');
const { requireAuth, requireSuperAdmin } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.use(requireAuth, requireSuperAdmin);
router.get('/overview', asyncHandler(controller.overview));
router.put('/webhook', asyncHandler(controller.saveWebhook));
router.post('/seeds', asyncHandler(controller.saveSeed));
router.put('/seeds/:id', asyncHandler(controller.saveSeed));
router.post('/seeds/:id/test', asyncHandler(controller.testSeed));
router.delete('/seeds/:id', asyncHandler(controller.removeSeed));
module.exports = router;
