// Parses a legacy stock-register .xlsx export (one row per item — "Item Name",
// "Pack", "Op. Stock", "Purch", "Sale", "#Others", "Cl Stock", "Ord", "Ord Fr",
// "Last Sale", "Amount", "Min Level") into rows ready to upsert into the Item
// master. The header row is located by content rather than a fixed row
// number, since exports of this kind commonly carry a few title/metadata
// rows above the real header.
const ExcelJS = require('exceljs');
const { classifyItemCategory } = require('./classifyItemCategory');

function normalizeHeader(h) {
  return String(h ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Only the columns Item.model.js actually needs are mapped — Op. Stock/Purch/
// Sale/#Others/Ord/Ord Fr/Last Sale describe stock movement, not the item
// master, and are intentionally not carried over (stock lives in StockLedger,
// not on Item — see .claude/graph/er-diagram.md).
const HEADER_ALIASES = {
  itemname: 'name',
  pack: 'unitSymbol',
  clstock: 'closingStock',
  amount: 'amount',
  minlevel: 'reorderLevel',
};

function round2(n) {
  return Math.round(n * 100) / 100;
}

async function parseItemWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('No worksheet found in the uploaded file');

  let headerRowNumber = null;
  let columnMap = {};
  for (let r = 1; r <= Math.min(30, sheet.rowCount); r++) {
    const row = sheet.getRow(r);
    const candidateMap = {};
    for (let c = 1; c <= sheet.columnCount; c++) {
      const alias = HEADER_ALIASES[normalizeHeader(row.getCell(c).value)];
      if (alias) candidateMap[alias] = c;
    }
    if (candidateMap.name && candidateMap.unitSymbol) {
      headerRowNumber = r;
      columnMap = candidateMap;
      break;
    }
  }

  if (!headerRowNumber) {
    throw new Error('Could not find the item header row (expected "Item Name" and "Pack" columns)');
  }

  const rows = [];
  const errors = [];

  for (let r = headerRowNumber + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const rawName = row.getCell(columnMap.name).value;
    const name = rawName == null ? '' : String(rawName).trim().replace(/\s+/g, ' ');

    // Trailing "TOTAL ..." / "VALUE OF ..." summary rows and blank rows —
    // not item data, quietly stop collecting rather than erroring.
    if (!name || /^total\b/i.test(name) || /^value of/i.test(name)) continue;

    const rawUnit = row.getCell(columnMap.unitSymbol).value;
    const unitSymbol = rawUnit == null ? '' : String(rawUnit).trim().toUpperCase();
    if (!unitSymbol) {
      errors.push({ row: r, message: `Item "${name}" has no Pack/unit value` });
      continue;
    }

    const closingStock = columnMap.closingStock ? Number(row.getCell(columnMap.closingStock).value) || 0 : 0;
    const amount = columnMap.amount ? Number(row.getCell(columnMap.amount).value) || 0 : 0;
    const reorderLevel = columnMap.reorderLevel ? Number(row.getCell(columnMap.reorderLevel).value) || 0 : 0;
    const standardRate = closingStock > 0 ? round2(amount / closingStock) : 0;

    rows.push({
      name,
      unitSymbol,
      reorderLevel: Math.max(0, reorderLevel),
      standardRate: Math.max(0, standardRate),
      category: classifyItemCategory(name),
    });
  }

  return { rows, errors };
}

module.exports = { parseItemWorkbook };
