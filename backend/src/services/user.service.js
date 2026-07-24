const userRepository = require('../repositories/user.repository');
const roleRepository = require('../repositories/role.repository');
const User = require('../models/User.model');
const ApiError = require('../utils/ApiError');
const auditLogService = require('./auditLog.service');
const { assertStaffTypeAllowsRole } = require('./helpers/staffTypeGate');

async function createUser(payload, actorId) {
  const role = await roleRepository.findById(payload.roleId, { populate: 'permissions' });
  if (!role) throw ApiError.badRequest('Role not found');

  assertStaffTypeAllowsRole(payload.staffType, role);

  const existing = await userRepository.findByEmail(payload.email);
  if (existing) throw ApiError.conflict('A user with this email already exists');

  const passwordHash = await User.hashPassword(payload.password);

  const user = await userRepository.create({
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    passwordHash,
    roleId: payload.roleId,
    storeId: payload.storeId,
    staffType: payload.staffType,
    createdBy: actorId,
    updatedBy: actorId,
  });

  await auditLogService.record({ userId: actorId, action: 'create', module: 'user', entityType: 'User', entityId: user._id, after: user.toObject() });

  return user;
}

async function listUsers({ page, limit, sort, search, filter }) {
  return userRepository.findPaginated({
    filter,
    page,
    limit,
    sort,
    search,
    searchFields: ['name', 'email', 'phone'],
    populate: 'roleId storeId',
  });
}

async function getUserById(id) {
  const user = await userRepository.findById(id, { populate: 'roleId storeId' });
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

async function updateUser(id, payload, actorId) {
  const before = await userRepository.findById(id);
  if (!before) throw ApiError.notFound('User not found');

  const updated = await userRepository.updateById(id, { ...payload, updatedBy: actorId });
  await auditLogService.record({ userId: actorId, action: 'update', module: 'user', entityType: 'User', entityId: id, before: before.toObject(), after: updated.toObject() });
  return updated;
}

async function updateUserStatus(id, status, actorId) {
  return updateUser(id, { status }, actorId);
}

// Role reassignment must re-check the staffType gate — a role's permission
// set can be edited after the fact, so this check has to run again here,
// not just at role-definition time.
async function assignRole(id, roleId, actorId) {
  const [user, role] = await Promise.all([
    userRepository.findById(id),
    roleRepository.findById(roleId, { populate: 'permissions' }),
  ]);
  if (!user) throw ApiError.notFound('User not found');
  if (!role) throw ApiError.badRequest('Role not found');

  assertStaffTypeAllowsRole(user.staffType, role);

  const updated = await userRepository.updateById(id, { roleId, updatedBy: actorId });
  await auditLogService.record({ userId: actorId, action: 'update', module: 'user', entityType: 'User', entityId: id, before: { roleId: user.roleId }, after: { roleId } });
  return updated;
}

async function softDeleteUser(id, actorId) {
  const user = await userRepository.softDeleteById(id, actorId);
  if (!user) throw ApiError.notFound('User not found');
  await auditLogService.record({ userId: actorId, action: 'delete', module: 'user', entityType: 'User', entityId: id });
  return user;
}

module.exports = {
  createUser,
  listUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  assignRole,
  softDeleteUser,
};
