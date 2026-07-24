const createMasterService = require('./genericMaster.service');
const storeRepository = require('../repositories/store.repository');

module.exports = createMasterService({
  repository: storeRepository,
  moduleName: 'store',
  entityType: 'Store',
});
