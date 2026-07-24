const BaseRepository = require('./base.repository');
const PaymentTerm = require('../models/PaymentTerm.model');

module.exports = new BaseRepository(PaymentTerm);
