const { Schema, model } = require('mongoose');
const auditablePlugin = require('./plugins/auditable.plugin');

const roleSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, trim: true },
  isSystemRole: { type: Boolean, default: false },
  permissions: [{ type: Schema.Types.ObjectId, ref: 'Permission' }],
});

roleSchema.plugin(auditablePlugin);

module.exports = model('Role', roleSchema);
