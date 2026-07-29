const { Schema, model } = require('mongoose');
const dayjs = require('dayjs');
const isoWeek = require('dayjs/plugin/isoWeek');
const auditablePlugin = require('./plugins/auditable.plugin');
const { MATERIAL_ISSUE_CATEGORY } = require('../constants/enums');

dayjs.extend(isoWeek);

const thaaliBudgetSchema = new Schema({
  category: { type: String, enum: Object.values(MATERIAL_ISSUE_CATEGORY), required: true },
  weekStartDate: { type: Date, required: true },
  amount: { type: Number, required: true, min: 0 },
});

// Normalized to the Monday of that ISO week regardless of which day was
// picked in the form, so the same week entered twice always collides on the
// unique index below, and the Thaali Cost Report can match a voucher's
// issueDate ISO week against this record unambiguously. Both hooks are
// needed: 'save' covers create (repository.create uses Model.create, which
// runs document middleware), 'findOneAndUpdate' covers the generic master
// service's update path (findByIdAndUpdate — a query, not a document save).
function normalizeToMonday(date) {
  return dayjs(date).startOf('isoWeek').toDate();
}

thaaliBudgetSchema.pre('save', function (next) {
  if (this.isModified('weekStartDate')) this.weekStartDate = normalizeToMonday(this.weekStartDate);
  next();
});

thaaliBudgetSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update?.weekStartDate) update.weekStartDate = normalizeToMonday(update.weekStartDate);
  next();
});

thaaliBudgetSchema.index({ category: 1, weekStartDate: 1 }, { unique: true });

thaaliBudgetSchema.plugin(auditablePlugin);

module.exports = model('ThaaliBudget', thaaliBudgetSchema);
