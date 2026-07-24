const vendorRepository = require('../repositories/vendor.repository');
const vendorBankAccountRepository = require('../repositories/vendorBankAccount.repository');
const vendorItemRateRepository = require('../repositories/vendorItemRate.repository');
const ApiError = require('../utils/ApiError');
const auditLogService = require('./auditLog.service');

async function createVendor(payload, actorId) {
  const vendor = await vendorRepository.create({ ...payload, createdBy: actorId, updatedBy: actorId });
  await auditLogService.record({ userId: actorId, action: 'create', module: 'vendor', entityType: 'Vendor', entityId: vendor._id, after: vendor.toObject() });
  return vendor;
}

function listVendors({ page, limit, sort, search, filter }) {
  return vendorRepository.findPaginated({
    page,
    limit,
    sort,
    search,
    filter,
    searchFields: ['name', 'contactPerson'],
    populate: 'paymentTermsId',
  });
}

async function getVendorById(id) {
  const vendor = await vendorRepository.findById(id, { populate: 'paymentTermsId itemsSupplied' });
  if (!vendor) throw ApiError.notFound('Vendor not found');
  return vendor;
}

async function updateVendor(id, payload, actorId) {
  const before = await vendorRepository.findById(id);
  if (!before) throw ApiError.notFound('Vendor not found');
  const updated = await vendorRepository.updateById(id, { ...payload, updatedBy: actorId });
  await auditLogService.record({ userId: actorId, action: 'update', module: 'vendor', entityType: 'Vendor', entityId: id, before: before.toObject(), after: updated.toObject() });
  return updated;
}

async function deleteVendor(id, actorId) {
  const vendor = await vendorRepository.softDeleteById(id, actorId);
  if (!vendor) throw ApiError.notFound('Vendor not found');
  await auditLogService.record({ userId: actorId, action: 'delete', module: 'vendor', entityType: 'Vendor', entityId: id });
  return vendor;
}

// --- Bank accounts (sub-resource) ---

async function addBankAccount(vendorId, payload, actorId) {
  const vendor = await vendorRepository.findById(vendorId);
  if (!vendor) throw ApiError.notFound('Vendor not found');

  if (payload.isPrimary) {
    await vendorBankAccountRepository.unsetPrimaryForVendor(vendorId);
  }

  const account = await vendorBankAccountRepository.create({ ...payload, vendorId, createdBy: actorId, updatedBy: actorId });
  await auditLogService.record({ userId: actorId, action: 'create', module: 'vendor_bank_account', entityType: 'VendorBankAccount', entityId: account._id, after: account.toObject() });
  return account;
}

function listBankAccounts(vendorId) {
  return vendorBankAccountRepository.findForVendor(vendorId);
}

async function removeBankAccount(vendorId, accountId, actorId) {
  const account = await vendorBankAccountRepository.findById(accountId);
  if (!account || account.vendorId.toString() !== vendorId) {
    throw ApiError.notFound('Bank account not found for this vendor');
  }
  await account.softDelete(actorId);
  await auditLogService.record({ userId: actorId, action: 'delete', module: 'vendor_bank_account', entityType: 'VendorBankAccount', entityId: accountId });
  return account;
}

// --- Item rates / quotation history (sub-resource) ---

// Adding a new rate closes out the previous current rate for that item so
// there is always at most one open-ended (effectiveTo: null) rate per
// vendor+item — this is what quotation comparison and PO pricing read from.
async function addItemRate(vendorId, payload, actorId) {
  const vendor = await vendorRepository.findById(vendorId);
  if (!vendor) throw ApiError.notFound('Vendor not found');

  await vendorItemRateRepository.closeCurrentRate(vendorId, payload.itemId, payload.effectiveFrom || new Date());

  const rate = await vendorItemRateRepository.create({ ...payload, vendorId, createdBy: actorId, updatedBy: actorId });
  await auditLogService.record({ userId: actorId, action: 'create', module: 'vendor_item_rate', entityType: 'VendorItemRate', entityId: rate._id, after: rate.toObject() });
  return rate;
}

function listItemRates(vendorId, itemId) {
  return vendorItemRateRepository.findForVendor(vendorId, { itemId });
}

module.exports = {
  createVendor,
  listVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
  addBankAccount,
  listBankAccounts,
  removeBankAccount,
  addItemRate,
  listItemRates,
};
