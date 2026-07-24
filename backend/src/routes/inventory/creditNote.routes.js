const { Router } = require('express');
const creditNoteController = require('../../controllers/creditNote.controller');
const creditNoteValidator = require('../../validators/creditNote.validator');
const validate = require('../../middlewares/validate.middleware');
const authorize = require('../../middlewares/authorize.middleware');
const queryParser = require('../../middlewares/queryParser.middleware');
const { PERMISSIONS } = require('../../constants/permissions');

const router = Router();

router.get('/', authorize(PERMISSIONS.CREDIT_NOTE_READ), queryParser, creditNoteController.list);
router.post('/', authorize(PERMISSIONS.CREDIT_NOTE_CREATE), creditNoteValidator.create, validate, creditNoteController.create);
router.get('/:id', authorize(PERMISSIONS.CREDIT_NOTE_READ), creditNoteController.getById);
router.patch('/:id/settle', authorize(PERMISSIONS.CREDIT_NOTE_UPDATE), creditNoteController.settle);

module.exports = router;
