const { Schema, model } = require('mongoose');
const auditablePlugin = require('./plugins/auditable.plugin');

const categorySchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  parentCategoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
  description: { type: String, trim: true },
});

categorySchema.plugin(auditablePlugin);

module.exports = model('Category', categorySchema);
