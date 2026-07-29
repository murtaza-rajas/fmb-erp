const createMasterService = require('./genericMaster.service');
const thaaliBudgetRepository = require('../repositories/thaaliBudget.repository');

module.exports = createMasterService({
  repository: thaaliBudgetRepository,
  moduleName: 'thaali_budget',
  entityType: 'ThaaliBudget',
  searchFields: ['category'],
});
