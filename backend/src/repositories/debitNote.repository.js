const BaseRepository = require('./base.repository');
const DebitNote = require('../models/DebitNote.model');

module.exports = new BaseRepository(DebitNote);
