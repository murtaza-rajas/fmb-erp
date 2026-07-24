const CompanySettings = require('../models/CompanySettings.model');
const SystemSettings = require('../models/SystemSettings.model');
const ApprovalMatrixEntry = require('../models/ApprovalMatrixEntry.model');
const ApiError = require('../utils/ApiError');
const auditLogService = require('./auditLog.service');

// Both settings collections are singletons — get-or-create rather than
// requiring a separate seed step, so a fresh install always has sane defaults.
async function getCompanySettings() {
  let doc = await CompanySettings.findOne();
  if (!doc) doc = await CompanySettings.create({});
  return doc;
}

async function updateCompanySettings(payload, actorId) {
  const doc = await getCompanySettings();
  const before = doc.toObject();
  Object.assign(doc, payload);
  await doc.save();
  await auditLogService.record({ userId: actorId, action: 'update', module: 'settings', entityType: 'CompanySettings', entityId: doc._id, before, after: doc.toObject() });
  return doc;
}

async function getSystemSettings() {
  let doc = await SystemSettings.findOne();
  if (!doc) doc = await SystemSettings.create({});
  return doc;
}

async function updateSystemSettings(payload, actorId) {
  const doc = await getSystemSettings();
  const before = doc.toObject();
  Object.assign(doc, payload);
  await doc.save();
  await auditLogService.record({ userId: actorId, action: 'update', module: 'settings', entityType: 'SystemSettings', entityId: doc._id, before, after: doc.toObject() });
  return doc;
}

// Public shape consumed by GET /app/config (no auth) — deliberately narrower
// than the full system settings document.
async function getAppConfig() {
  const settings = await getSystemSettings();
  return {
    latestVersion: settings.latestVersion,
    minSupportedVersion: settings.minSupportedVersion,
    forceUpdate: settings.forceUpdate,
    maintenanceMode: settings.maintenanceMode,
    maintenanceMessage: settings.maintenanceMessage,
  };
}

async function createApprovalMatrixEntry(payload, actorId) {
  const entry = await ApprovalMatrixEntry.create({ ...payload, createdBy: actorId, updatedBy: actorId });
  await auditLogService.record({ userId: actorId, action: 'create', module: 'settings', entityType: 'ApprovalMatrixEntry', entityId: entry._id, after: entry.toObject() });
  return entry;
}

function listApprovalMatrix() {
  return ApprovalMatrixEntry.find({ isDeleted: false }).populate('requiredApproverRoleId');
}

async function updateApprovalMatrixEntry(id, payload, actorId) {
  const before = await ApprovalMatrixEntry.findById(id);
  if (!before) throw ApiError.notFound('Approval matrix entry not found');
  const updated = await ApprovalMatrixEntry.findByIdAndUpdate(id, { ...payload, updatedBy: actorId }, { new: true, runValidators: true });
  await auditLogService.record({ userId: actorId, action: 'update', module: 'settings', entityType: 'ApprovalMatrixEntry', entityId: id, before: before.toObject(), after: updated.toObject() });
  return updated;
}

module.exports = {
  getCompanySettings,
  updateCompanySettings,
  getSystemSettings,
  updateSystemSettings,
  getAppConfig,
  createApprovalMatrixEntry,
  listApprovalMatrix,
  updateApprovalMatrixEntry,
};
