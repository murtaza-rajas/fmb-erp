const { Schema, model } = require('mongoose');
const auditablePlugin = require('./plugins/auditable.plugin');
const { NOTE_STATUS, REJECTION_REASON } = require('../constants/enums');

const debitNoteItemSchema = new Schema(
  {
    itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
    quantity: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, enum: [...Object.values(REJECTION_REASON), 'short_supply', 'return'], required: true },
  },
  { _id: false }
);

const attachmentSchema = new Schema(
  {
    fileKey: { type: String, required: true },
    contentType: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const debitNoteSchema = new Schema({
  dnNumber: { type: String, required: true, unique: true },
  vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
  poId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  grnId: { type: Schema.Types.ObjectId, ref: 'Grn' },
  items: {
    type: [debitNoteItemSchema],
    required: true,
    validate: { validator: (v) => v.length > 0, message: 'At least one item is required' },
  },
  totalAmount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: Object.values(NOTE_STATUS), default: NOTE_STATUS.OPEN },
  attachments: { type: [attachmentSchema], default: [] },
});

debitNoteSchema.plugin(auditablePlugin);

module.exports = model('DebitNote', debitNoteSchema);
