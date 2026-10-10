const express = require('express');
const controller = require('../controllers/billingController');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.get('/plans', asyncHandler(controller.listPlans));
router.use(requireAuth);
router.get('/overview', asyncHandler(controller.overview));
router.post('/invoices', asyncHandler(controller.createInvoice));
router.post('/invoices/:id/submit', asyncHandler(controller.submitPayment));

module.exports = router;
