const createMasterController = require('./genericMaster.controller');
const unitService = require('../services/unit.service');

module.exports = createMasterController(unitService, { populate: 'baseUnitId' });
