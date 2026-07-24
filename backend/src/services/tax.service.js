const createMasterService = require('./genericMaster.service');
const taxRepository = require('../repositories/tax.repository');

module.exports = createMasterService({
  repository: taxRepository,
  moduleName: 'tax',
  entityType: 'Tax',
});
