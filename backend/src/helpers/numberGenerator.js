const dayjs = require('dayjs');
const Counter = require('../models/Counter.model');

// Generates document numbers like "PRN-2026-00042" — sequence resets each
// calendar year (the counter key is scoped by prefix+year).
async function generateDocumentNumber(prefix, { session } = {}) {
  const year = dayjs().year();
  const key = `${prefix}-${year}`;

  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, session }
  );

  return `${prefix}-${year}-${String(counter.seq).padStart(5, '0')}`;
}

module.exports = { generateDocumentNumber };
