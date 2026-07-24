const createMasterController = require('./genericMaster.controller');
const paymentTermService = require('../services/paymentTerm.service');

module.exports = createMasterController(paymentTermService);
