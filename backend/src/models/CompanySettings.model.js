const { Schema, model } = require('mongoose');

// Singleton — the service layer always operates on the single existing
// document (creating a default one on first read) rather than allowing
// multiple company records.
const companySettingsSchema = new Schema(
  {
    name: { type: String, default: 'FMB Nagpur' },
    logoUrl: { type: String },
    address: { type: String },
    gstin: { type: String },
    financialYearStartMonth: { type: Number, min: 1, max: 12, default: 4 },
    currency: { type: String, default: 'INR' },
  },
  { timestamps: true }
);

module.exports = model('CompanySettings', companySettingsSchema);
