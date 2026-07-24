const BaseRepository = require('./base.repository');
const VendorInvoice = require('../models/VendorInvoice.model');

module.exports = new BaseRepository(VendorInvoice);
