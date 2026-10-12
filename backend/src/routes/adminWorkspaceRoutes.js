const express = require('express');
const controller = require('../controllers/adminWorkspaceController');
const { requireAuth, requireSuperAdmin } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.use(requireAuth, requireSuperAdmin);
router.get('/', asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.getOne));
router.patch('/:id/status', asyncHandler(controller.updateStatus));
router.put('/:id/sending-identity', asyncHandler(controller.updateIdentity));
router.post('/:id/test-provider', asyncHandler(controller.testProvider));

module.exports = router;
