const createMasterController = require('./genericMaster.controller');
const storeService = require('../services/store.service');

module.exports = createMasterController(storeService, { populate: 'responsiblePersonId' });
