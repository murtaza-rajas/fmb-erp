const roleRepository = require('../repositories/role.repository');
const permissionRepository = require('../repositories/permission.repository');
const User = require('../models/User.model');
const ApiError = require('../utils/ApiError');
const auditLogService = require('./auditLog.service');
const { STAFF_TYPES } = require('../constants/roles');

async function createRole(payload, actorId) {
  const permissions = payload.permissionIds?.length
    ? await permissionRepository.model.find({ _id: { $in: payload.permissionIds } })
    : [];

  const role = await roleRepository.create({
    name: payload.name,
    description: payload.description,
    permissions: permissions.map((p) => p._id),
    createdBy: actorId,
    updatedBy: actorId,
  });

  await auditLogService.record({ userId: actorId, action: 'create', module: 'role', entityType: 'Role', entityId: role._id, after: role.toObject() });
  return role;
}

async function listRoles({ page, limit, sort, search }) {
  return roleRepository.findPaginated({ page, limit, sort, search, searchFields: ['name'], populate: 'permissions' });
}

async function getRoleById(id) {
  const role = await roleRepository.findById(id, { populate: 'permissions' });
  if (!role) throw ApiError.notFound('Role not found');
  return role;
}

// Updating a role's permission set must be re-checked against the staffType
// gate: if this update would add a payment-approval-gated permission to a
// role that already has khidmat_gujar members, block it. The SOP's
// restriction must survive an admin editing a role after users are assigned,
// not just at role-creation time.
async function updatePermissions(id, permissionIds, actorId) {
  const role = await roleRepository.findById(id, { populate: 'permissions' });
  if (!role) throw ApiError.notFound('Role not found');

  const newPermissions = await permissionRepository.model.find({ _id: { $in: permissionIds } });
  const addsGatedPermission = newPermissions.some((p) => p.isPaymentApprovalGate);

  if (addsGatedPermission) {
    const khidmatGujarMemberExists = await User.exists({ roleId: id, staffType: STAFF_TYPES.KHIDMAT_GUJAR, isDeleted: false });
    if (khidmatGujarMemberExists) {
      throw ApiError.forbidden(
        `Cannot grant payment-approval permission to role "${role.name}" — it has Khidmat Gujar members. Reassign those users to another role first.`,
        'PAYMENT_APPROVAL_RESTRICTED_TO_PAID_STAFF'
      );
    }
  }

  const before = role.toObject();
  role.permissions = newPermissions.map((p) => p._id);
  role.updatedBy = actorId;
  await role.save();

  await auditLogService.record({ userId: actorId, action: 'update', module: 'role', entityType: 'Role', entityId: id, before, after: role.toObject() });
  return role;
}

async function deleteRole(id, actorId) {
  const role = await roleRepository.findById(id);
  if (!role) throw ApiError.notFound('Role not found');
  if (role.isSystemRole) throw ApiError.forbidden('System roles cannot be deleted');

  const memberExists = await User.exists({ roleId: id, isDeleted: false });
  if (memberExists) throw ApiError.conflict('Role has active users assigned and cannot be deleted');

  await role.softDelete(actorId);
  await auditLogService.record({ userId: actorId, action: 'delete', module: 'role', entityType: 'Role', entityId: id });
  return role;
}

module.exports = { createRole, listRoles, getRoleById, updatePermissions, deleteRole };
