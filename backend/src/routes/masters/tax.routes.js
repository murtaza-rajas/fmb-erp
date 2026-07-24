const createMasterRoutes = require('../factories/masterRoutes.factory');
const taxController = require('../../controllers/tax.controller');
const taxValidator = require('../../validators/tax.validator');

module.exports = createMasterRoutes({ controller: taxController, validator: taxValidator });
