const express = require('express');
const multer = require('multer');
const controller = require('../controllers/contactController');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      return cb(new Error('Only .csv files are accepted.'));
    }
    cb(null, true);
  },
});

router.get('/', asyncHandler(controller.list));
router.get('/unsubscribed', asyncHandler(controller.unsubscribeList));
router.get('/:id', asyncHandler(controller.getOne));
router.post('/', asyncHandler(controller.create));
router.put('/:id', asyncHandler(controller.update));
router.delete('/:id', asyncHandler(controller.remove));
router.post('/import', upload.single('file'), asyncHandler(controller.importCsv));

module.exports = router;
