const createMasterService = require('./genericMaster.service');
const unitRepository = require('../repositories/unit.repository');

module.exports = createMasterService({
  repository: unitRepository,
  moduleName: 'unit',
  entityType: 'Unit',
});
