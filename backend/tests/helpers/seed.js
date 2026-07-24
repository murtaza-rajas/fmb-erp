const Permission = require('../../src/models/Permission.model');
const Role = require('../../src/models/Role.model');
const User = require('../../src/models/User.model');
const permissionSeedData = require('../../src/seed/permissions.seed');
const roleSeedData = require('../../src/seed/roles.seed');
const { ROLES, STAFF_TYPES } = require('../../src/constants/roles');

async function seedPermissionsAndRoles() {
  await Permission.insertMany(permissionSeedData);

  for (const roleDef of roleSeedData) {
    const permissions = await Permission.find({ key: { $in: roleDef.permissionKeys } });
    await Role.create({
      name: roleDef.name,
      description: roleDef.description,
      isSystemRole: roleDef.isSystemRole,
      permissions: permissions.map((p) => p._id),
    });
  }
}

async function createUser({ name = 'Test User', email, password = 'Password@123', roleName, staffType = STAFF_TYPES.PAID }) {
  const role = await Role.findOne({ name: roleName });
  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ name, email, passwordHash, roleId: role._id, staffType, isEmailVerified: true });
  return { user, password };
}

module.exports = { seedPermissionsAndRoles, createUser, ROLES, STAFF_TYPES };
