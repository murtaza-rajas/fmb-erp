const crypto = require('crypto');

// Generates short, human-readable codes like "ITM-A1B2C3" for entities that
// need a unique code but don't warrant a dedicated running-sequence counter
// collection (PRN/PO numbers use a sequence instead — see numberGenerator.js).
function generateCode(prefix) {
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${suffix}`;
}

module.exports = { generateCode };
