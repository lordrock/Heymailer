const express = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/templateController');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.use(requireAuth);

router.get('/', asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.getOne));
router.post(
  '/',
  [body('name').notEmpty(), body('subject').notEmpty(), body('htmlContent').notEmpty()],
  validate,
  asyncHandler(controller.create)
);
router.put('/:id', asyncHandler(controller.update));
router.delete('/:id', asyncHandler(controller.remove));
router.post('/:id/duplicate', asyncHandler(controller.duplicate));

module.exports = router;
