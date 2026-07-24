const BaseRepository = require('./base.repository');
const PurchaseOrder = require('../models/PurchaseOrder.model');

module.exports = new BaseRepository(PurchaseOrder);
