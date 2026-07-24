const ApiError = require('../utils/ApiError');
const auditLogService = require('./auditLog.service');

// Factory for simple lookup masters (Category, Unit, Tax, Payment Terms) that
// are all plain create/list/update/soft-delete with audit logging and no
// bespoke business rules. Item, Vendor and Store have their own services
// because they carry real relationships/rules beyond CRUD.
function createMasterService({ repository, moduleName, entityType, searchFields = ['name'] }) {
  async function create(payload, actorId) {
    const doc = await repository.create({ ...payload, createdBy: actorId, updatedBy: actorId });
    await auditLogService.record({ userId: actorId, action: 'create', module: moduleName, entityType, entityId: doc._id, after: doc.toObject() });
    return doc;
  }

  function list({ page, limit, sort, search, filter, populate }) {
    return repository.findPaginated({ page, limit, sort, search, filter, searchFields, populate });
  }

  async function getById(id, { populate } = {}) {
    const doc = await repository.findById(id, { populate });
    if (!doc) throw ApiError.notFound(`${entityType} not found`);
    return doc;
  }

  async function update(id, payload, actorId) {
    const before = await repository.findById(id);
    if (!before) throw ApiError.notFound(`${entityType} not found`);
    const updated = await repository.updateById(id, { ...payload, updatedBy: actorId });
    await auditLogService.record({ userId: actorId, action: 'update', module: moduleName, entityType, entityId: id, before: before.toObject(), after: updated.toObject() });
    return updated;
  }

  async function remove(id, actorId) {
    const doc = await repository.softDeleteById(id, actorId);
    if (!doc) throw ApiError.notFound(`${entityType} not found`);
    await auditLogService.record({ userId: actorId, action: 'delete', module: moduleName, entityType, entityId: id });
    return doc;
  }

  return { create, list, getById, update, remove };
}

module.exports = createMasterService;
