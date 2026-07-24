const BaseRepository = require('./base.repository');
const PurchaseRequisition = require('../models/PurchaseRequisition.model');

module.exports = new BaseRepository(PurchaseRequisition);
