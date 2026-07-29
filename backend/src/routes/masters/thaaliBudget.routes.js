const createMasterRoutes = require('../factories/masterRoutes.factory');
const thaaliBudgetController = require('../../controllers/thaaliBudget.controller');
const thaaliBudgetValidator = require('../../validators/thaaliBudget.validator');

module.exports = createMasterRoutes({ controller: thaaliBudgetController, validator: thaaliBudgetValidator });
