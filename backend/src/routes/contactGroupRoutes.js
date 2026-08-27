const express = require('express');
const controller = require('../controllers/contactGroupController');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.use(requireAuth);

router.get('/', asyncHandler(controller.list));
router.post('/', asyncHandler(controller.create));
router.post('/:id/contacts/transfer', asyncHandler(controller.transferContacts));
router.put('/:id', asyncHandler(controller.update));
router.delete('/:id', asyncHandler(controller.remove));

module.exports = router;
