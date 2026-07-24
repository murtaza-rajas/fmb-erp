const createMasterController = require('./genericMaster.controller');
const taxService = require('../services/tax.service');

module.exports = createMasterController(taxService);
