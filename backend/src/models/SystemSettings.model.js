const { Schema, model } = require('mongoose');

// Singleton — also backs the public GET /app/config endpoint mobile clients
// poll on launch for force-update/maintenance-mode gating (see
// docs/architecture/api-design.md § App Config).
const systemSettingsSchema = new Schema(
  {
    latestVersion: { type: String, default: '1.0.0' },
    minSupportedVersion: { type: String, default: '1.0.0' },
    forceUpdate: { type: Boolean, default: false },
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: { type: String },
    backupScheduleCron: { type: String, default: '0 3 * * *' },
  },
  { timestamps: true }
);

module.exports = model('SystemSettings', systemSettingsSchema);
