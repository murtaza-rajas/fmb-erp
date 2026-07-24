const createMasterRoutes = require('../factories/masterRoutes.factory');
const categoryController = require('../../controllers/category.controller');
const categoryValidator = require('../../validators/category.validator');

module.exports = createMasterRoutes({ controller: categoryController, validator: categoryValidator });
