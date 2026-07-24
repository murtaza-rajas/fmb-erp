const createMasterService = require('./genericMaster.service');
const paymentTermRepository = require('../repositories/paymentTerm.repository');

module.exports = createMasterService({
  repository: paymentTermRepository,
  moduleName: 'payment_term',
  entityType: 'PaymentTerm',
});
