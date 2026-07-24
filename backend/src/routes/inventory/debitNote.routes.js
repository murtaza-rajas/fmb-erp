const { Router } = require('express');
const debitNoteController = require('../../controllers/debitNote.controller');
const debitNoteValidator = require('../../validators/debitNote.validator');
const validate = require('../../middlewares/validate.middleware');
const authorize = require('../../middlewares/authorize.middleware');
const queryParser = require('../../middlewares/queryParser.middleware');
const { PERMISSIONS } = require('../../constants/permissions');

const router = Router();

router.get('/', authorize(PERMISSIONS.DEBIT_NOTE_READ), queryParser, debitNoteController.list);
router.post('/', authorize(PERMISSIONS.DEBIT_NOTE_CREATE), debitNoteValidator.create, validate, debitNoteController.create);
router.get('/:id', authorize(PERMISSIONS.DEBIT_NOTE_READ), debitNoteController.getById);
router.patch('/:id/settle', authorize(PERMISSIONS.DEBIT_NOTE_UPDATE), debitNoteController.settle);

module.exports = router;
