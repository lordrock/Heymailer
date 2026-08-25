const express = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/templateController');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();
router.use(requireAuth);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post(
  '/',
  [body('name').notEmpty(), body('subject').notEmpty(), body('htmlContent').notEmpty()],
  validate,
  controller.create
);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);
router.post('/:id/duplicate', controller.duplicate);

module.exports = router;
