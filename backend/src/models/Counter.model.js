const { Schema, model } = require('mongoose');

// Backs atomic running-sequence document numbers (PRN, PO, GRN, etc.) — one
// document per `key` (e.g. "PRN-2026"), incremented with findOneAndUpdate so
// concurrent requests never collide.
const counterSchema = new Schema({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, required: true, default: 0 },
});

module.exports = model('Counter', counterSchema);
