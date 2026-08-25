const express = require('express');
const controller = require('../controllers/campaignController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

router.post('/resolve-recipients', controller.resolveRecipientPreview);
router.post('/send-test', controller.sendTest);
router.post('/:id/send', controller.startSend);
router.post('/:id/cancel', controller.cancelSend);

module.exports = router;
