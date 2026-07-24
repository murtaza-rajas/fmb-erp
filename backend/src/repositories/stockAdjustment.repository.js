const BaseRepository = require('./base.repository');
const StockAdjustment = require('../models/StockAdjustment.model');

module.exports = new BaseRepository(StockAdjustment);
