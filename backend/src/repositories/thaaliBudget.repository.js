const BaseRepository = require('./base.repository');
const ThaaliBudget = require('../models/ThaaliBudget.model');

module.exports = new BaseRepository(ThaaliBudget);
