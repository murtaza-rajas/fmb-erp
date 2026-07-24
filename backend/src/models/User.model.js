const { Schema, model } = require('mongoose');
const bcrypt = require('bcrypt');
const auditablePlugin = require('./plugins/auditable.plugin');
const { USER_STATUS } = require('../constants/enums');
const { STAFF_TYPES } = require('../constants/roles');
const { bcryptSaltRounds } = require('../config/env');

const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  phone: { type: String, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true, index: true },
  storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
  staffType: {
    type: String,
    enum: Object.values(STAFF_TYPES),
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(USER_STATUS),
    default: USER_STATUS.ACTIVE,
  },
  isEmailVerified: { type: Boolean, default: false },
  avatarUrl: { type: String },
  lastLoginAt: { type: Date },
  mustChangePassword: { type: Boolean, default: false },
});

userSchema.index({ roleId: 1, status: 1 });
userSchema.index({ staffType: 1 });

userSchema.methods.comparePassword = function comparePassword(plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

userSchema.statics.hashPassword = function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, bcryptSaltRounds);
};

userSchema.plugin(auditablePlugin);

// `select: false` only hides passwordHash on queries — it's still present on
// documents returned directly from .create()/.save(), so strip it here too,
// at the serialization boundary, rather than relying on every call site to remember.
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

module.exports = model('User', userSchema);
