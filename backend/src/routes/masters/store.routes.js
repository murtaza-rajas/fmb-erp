const createMasterRoutes = require('../factories/masterRoutes.factory');
const storeController = require('../../controllers/store.controller');
const storeValidator = require('../../validators/store.validator');

module.exports = createMasterRoutes({ controller: storeController, validator: storeValidator });
