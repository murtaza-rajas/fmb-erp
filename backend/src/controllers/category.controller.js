const createMasterController = require('./genericMaster.controller');
const categoryService = require('../services/category.service');

module.exports = createMasterController(categoryService, { populate: 'parentCategoryId' });
