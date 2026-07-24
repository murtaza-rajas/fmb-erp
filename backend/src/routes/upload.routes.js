const { Router } = require('express');
const uploadController = require('../controllers/upload.controller');
const uploadValidator = require('../validators/upload.validator');
const validate = require('../middlewares/validate.middleware');
const authenticate = require('../middlewares/authenticate.middleware');

const router = Router();
router.use(authenticate);

router.post('/presign', uploadValidator.presign, validate, uploadController.presign);
router.get('/view-url', uploadValidator.viewUrl, validate, uploadController.viewUrl);

module.exports = router;
