const express = require('express');
const controller = require('../controllers/draftController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', controller.upsert);
router.put('/:id', controller.upsert);
router.delete('/:id', controller.remove);

module.exports = router;
