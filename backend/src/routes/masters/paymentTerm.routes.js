const createMasterRoutes = require('../factories/masterRoutes.factory');
const paymentTermController = require('../../controllers/paymentTerm.controller');
const paymentTermValidator = require('../../validators/paymentTerm.validator');

module.exports = createMasterRoutes({ controller: paymentTermController, validator: paymentTermValidator });
