const BaseRepository = require('./base.repository');
const StockTransfer = require('../models/StockTransfer.model');

module.exports = new BaseRepository(StockTransfer);
