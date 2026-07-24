const BaseRepository = require('./base.repository');
const Tax = require('../models/Tax.model');

module.exports = new BaseRepository(Tax);
