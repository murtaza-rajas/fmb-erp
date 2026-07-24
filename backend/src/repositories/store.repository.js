const BaseRepository = require('./base.repository');
const Store = require('../models/Store.model');

module.exports = new BaseRepository(Store);
