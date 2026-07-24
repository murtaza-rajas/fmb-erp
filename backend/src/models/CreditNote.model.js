const { Schema, model } = require('mongoose');
const auditablePlugin = require('./plugins/auditable.plugin');
const { NOTE_STATUS } = require('../constants/enums');

const creditNoteSchema = new Schema({
  cnNumber: { type: String, required: true, unique: true },
  vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  reason: { type: String, required: true, trim: true },
  status: { type: String, enum: Object.values(NOTE_STATUS), default: NOTE_STATUS.OPEN },
});

creditNoteSchema.plugin(auditablePlugin);

module.exports = model('CreditNote', creditNoteSchema);
