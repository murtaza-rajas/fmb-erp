const { Schema, model } = require('mongoose');
const auditablePlugin = require('./plugins/auditable.plugin');

const permissionSchema = new Schema({
  key: { type: String, required: true, unique: true, trim: true },
  module: { type: String, required: true, trim: true },
  action: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  isPaymentApprovalGate: { type: Boolean, default: false },
});

permissionSchema.index({ module: 1 });
permissionSchema.plugin(auditablePlugin);

module.exports = model('Permission', permissionSchema);
