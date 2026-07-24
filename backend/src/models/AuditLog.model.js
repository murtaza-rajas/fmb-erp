const { Schema, model } = require('mongoose');

const auditLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true }, // create | update | delete | approve | login | ...
    module: { type: String, required: true },
    entityType: { type: String },
    entityId: { type: Schema.Types.ObjectId },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    ip: { type: String },
  },
  { timestamps: { createdAt: 'timestamp', updatedAt: false } }
);

auditLogSchema.index({ module: 1, entityId: 1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });

module.exports = model('AuditLog', auditLogSchema);
