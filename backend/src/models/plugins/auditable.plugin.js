const { Schema } = require('mongoose');

// Adds the common createdBy/updatedBy/soft-delete fields required on every
// business collection (docs/architecture/database-schema.md — Conventions).
function auditablePlugin(schema) {
  schema.add({
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  });

  schema.set('timestamps', true);

  schema.index({ isDeleted: 1 });

  schema.methods.softDelete = function softDelete(userId, { session } = {}) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = userId;
    return this.save({ session });
  };

  const excludeDeleted = function excludeDeleted() {
    if (this.getFilter().isDeleted === undefined) {
      this.where({ isDeleted: false });
    }
  };

  schema.pre('find', excludeDeleted);
  schema.pre('findOne', excludeDeleted);
  schema.pre('countDocuments', excludeDeleted);
}

module.exports = auditablePlugin;
