const { Router } = require('express');
const deviceController = require('../controllers/device.controller');
const deviceValidator = require('../validators/device.validator');
const notificationController = require('../controllers/notification.controller');
const validate = require('../middlewares/validate.middleware');
const authenticate = require('../middlewares/authenticate.middleware');
const queryParser = require('../middlewares/queryParser.middleware');

const router = Router();
router.use(authenticate);

router.get('/', queryParser, notificationController.list);
router.patch('/read-all', notificationController.markAllRead);
router.patch('/:id/read', notificationController.markRead);

router.post('/devices', deviceValidator.register, validate, deviceController.register);
router.delete('/devices/:deviceId', deviceValidator.deregister, validate, deviceController.deregister);

module.exports = router;
