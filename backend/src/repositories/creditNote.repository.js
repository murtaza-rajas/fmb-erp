const BaseRepository = require('./base.repository');
const CreditNote = require('../models/CreditNote.model');

module.exports = new BaseRepository(CreditNote);
