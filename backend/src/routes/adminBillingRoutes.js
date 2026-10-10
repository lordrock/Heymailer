const express = require('express');
const controller = require('../controllers/adminBillingController');
const { requireAuth, requireSuperAdmin } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.use(requireAuth, requireSuperAdmin);
router.get('/overview', asyncHandler(controller.overview));
router.put('/wallets', asyncHandler(controller.saveWallet));
router.patch('/wallets/:id', asyncHandler(controller.toggleWallet));
router.put('/plans/:id', asyncHandler(controller.savePlan));
router.patch('/invoices/:id/review', asyncHandler(controller.reviewInvoice));

module.exports = router;
