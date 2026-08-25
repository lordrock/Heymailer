const express = require('express');
const multer = require('multer');
const controller = require('../controllers/contactController');
const { requireAuth } = require('../middleware/auth');

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

router.get('/', controller.list);
router.get('/unsubscribed', controller.unsubscribeList);
router.get('/:id', controller.getOne);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);
router.post('/import', upload.single('file'), controller.importCsv);

module.exports = router;
