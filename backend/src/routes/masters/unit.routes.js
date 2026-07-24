const createMasterRoutes = require('../factories/masterRoutes.factory');
const unitController = require('../../controllers/unit.controller');
const unitValidator = require('../../validators/unit.validator');

module.exports = createMasterRoutes({ controller: unitController, validator: unitValidator });
