const permissionRepository = require('../repositories/permission.repository');

// Permissions are seed data (see seed/permissions.seed.js) — this service is
// read-only by design; permission *keys* are not created ad hoc through the API.
async function listPermissions({ module: moduleFilter } = {}) {
  const filter = moduleFilter ? { module: moduleFilter } : {};
  return permissionRepository.model.find(filter).sort({ module: 1, action: 1 });
}

module.exports = { listPermissions };
