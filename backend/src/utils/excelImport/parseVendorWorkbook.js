// Parses a legacy "DETAILS OF PARTIES" .xlsx export into rows ready to upsert
// into the Vendor master. Unlike the item register, this export is NOT
// tabular — each vendor is a vertical key/value block ("NAME" in column A /
// value in column B, then "CONTACT PERSONS", "R_Address", "PHONE OFFICE",
// "MOBILE", "EMAIL ID", ... stacked below it), and block length varies
// (addresses can wrap onto an extra row). So vendor boundaries are found by
// scanning for "NAME" markers in column A rather than assuming a fixed
// number of rows per record.
//
// Only the fields that exist on Vendor.model.js are extracted — the source
// also carries address/GSTIN/credit-terms/banned-status columns, which
// aren't SOP-mandated Vendor fields (see .claude/CLAUDE.md) and are
// intentionally dropped here.
const ExcelJS = require('exceljs');

const FIELD_LABELS = {
  NAME: 'name',
  'CONTACT PERSONS': 'contactPerson',
  'PHONE OFFICE': 'phoneOffice',
  'PHONE RESI.': 'phoneResi',
  'PHONE FACTORY': 'phoneFactory',
  MOBILE: 'mobile',
  'EMAIL ID': 'email',
};

function normalizeLabel(label) {
  return String(label ?? '').trim().toUpperCase();
}

function cleanValue(value) {
  if (value == null) return undefined;
  const str = String(value).trim().replace(/\s+/g, ' ');
  if (!str || str === '.') return undefined; // placeholder values seen in the source
  return str;
}

async function parseVendorWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('No worksheet found in the uploaded file');

  const nameRowIndices = [];
  for (let r = 1; r <= sheet.rowCount; r++) {
    if (normalizeLabel(sheet.getRow(r).getCell(1).value) === 'NAME') {
      nameRowIndices.push(r);
    }
  }

  if (nameRowIndices.length === 0) {
    throw new Error('No vendor records found — expected rows with "NAME" in column A');
  }

  const rows = [];
  const errors = [];

  nameRowIndices.forEach((startRow, idx) => {
    const endRow = idx + 1 < nameRowIndices.length ? nameRowIndices[idx + 1] - 1 : sheet.rowCount;
    const record = {};

    for (let r = startRow; r <= endRow; r++) {
      const row = sheet.getRow(r);
      const key = FIELD_LABELS[normalizeLabel(row.getCell(1).value)];
      if (!key || record[key] !== undefined) continue;
      const value = cleanValue(row.getCell(2).value);
      if (value !== undefined) record[key] = value;
    }

    if (!record.name) {
      errors.push({ row: startRow, message: 'Vendor block has no name value in column B' });
      return;
    }

    rows.push({
      name: record.name,
      contactPerson: record.contactPerson,
      phone: record.mobile || record.phoneOffice || record.phoneResi || record.phoneFactory,
      email: record.email,
    });
  });

  return { rows, errors };
}

module.exports = { parseVendorWorkbook };
