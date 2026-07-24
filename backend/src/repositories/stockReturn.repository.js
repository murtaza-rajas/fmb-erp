const BaseRepository = require('./base.repository');
const StockReturn = require('../models/StockReturn.model');

module.exports = new BaseRepository(StockReturn);
