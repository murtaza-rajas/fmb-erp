const createMasterService = require('./genericMaster.service');
const categoryRepository = require('../repositories/category.repository');

module.exports = createMasterService({
  repository: categoryRepository,
  moduleName: 'category',
  entityType: 'Category',
});
