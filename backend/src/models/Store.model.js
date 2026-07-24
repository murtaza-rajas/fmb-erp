const { Schema, model } = require('mongoose');
const auditablePlugin = require('./plugins/auditable.plugin');

const storeSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  address: { type: String, trim: true },
  responsiblePersonId: { type: Schema.Types.ObjectId, ref: 'User' },
  contact: { type: String, trim: true },
  isDefault: { type: Boolean, default: false },
});

storeSchema.plugin(auditablePlugin);

module.exports = model('Store', storeSchema);
