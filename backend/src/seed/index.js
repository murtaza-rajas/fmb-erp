const { connectDb, disconnectDb } = require('../config/db');
const Permission = require('../models/Permission.model');
const Role = require('../models/Role.model');
const User = require('../models/User.model');
const permissionSeedData = require('./permissions.seed');
const roleSeedData = require('./roles.seed');
const { STAFF_TYPES } = require('../constants/roles');
const { ROLES } = require('../constants/roles');
const logger = require('../utils/logger');

async function seedPermissions() {
  const ops = permissionSeedData.map((p) => ({
    updateOne: { filter: { key: p.key }, update: { $set: p }, upsert: true },
  }));
  await Permission.bulkWrite(ops);
  logger.info(`Seeded ${permissionSeedData.length} permissions`);
}

async function seedRoles() {
  for (const roleDef of roleSeedData) {
    const permissions = await Permission.find({ key: { $in: roleDef.permissionKeys } });
    await Role.findOneAndUpdate(
      { name: roleDef.name },
      {
        name: roleDef.name,
        description: roleDef.description,
        isSystemRole: roleDef.isSystemRole,
        permissions: permissions.map((p) => p._id),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  logger.info(`Seeded ${roleSeedData.length} roles`);
}

async function seedSuperAdmin() {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL || 'admin@fmb-erp.local';
  const existing = await User.findOne({ email });
  if (existing) {
    logger.info('Super Admin user already exists, skipping');
    return;
  }

  const password = process.env.SEED_SUPER_ADMIN_PASSWORD || 'ChangeMe@123';
  const role = await Role.findOne({ name: ROLES.SUPER_ADMIN });
  if (!role) throw new Error('Super Admin role not found — run seedRoles first');

  const passwordHash = await User.hashPassword(password);
  await User.create({
    name: 'Super Admin',
    email,
    passwordHash,
    roleId: role._id,
    staffType: STAFF_TYPES.PAID,
    isEmailVerified: true,
    mustChangePassword: true,
  });

  logger.info(`Seeded Super Admin user: ${email} (password: ${password} — change immediately)`);
}

async function run() {
  await connectDb();
  await seedPermissions();
  await seedRoles();
  await seedSuperAdmin();
  await disconnectDb();
  logger.info('Seeding complete');
  process.exit(0);
}

run().catch((err) => {
  logger.error('Seeding failed', { error: err.message, stack: err.stack });
  process.exit(1);
});
