const createMasterController = require('./genericMaster.controller');
const thaaliBudgetService = require('../services/thaaliBudget.service');

module.exports = createMasterController(thaaliBudgetService);
