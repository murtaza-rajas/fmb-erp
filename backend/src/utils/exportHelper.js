const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// Shared tabular export for every report endpoint — one implementation of
// csv/excel/pdf so each report only needs to supply { columns, rows }.
// columns: [{ key, header }]

function toCsv(columns, rows) {
  const escape = (value) => {
    const str = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const header = columns.map((c) => escape(c.header)).join(',');
  const lines = rows.map((row) => columns.map((c) => escape(row[c.key])).join(','));
  return [header, ...lines].join('\n');
}

async function toExcelBuffer(columns, rows, sheetName = 'Report') {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: 20 }));
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => sheet.addRow(row));

  return workbook.xlsx.writeBuffer();
}

function toPdfBuffer(columns, rows, title) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(14).text(title, { align: 'left' });
    doc.moveDown();

    const colWidth = (doc.page.width - 80) / columns.length;
    doc.fontSize(9);
    columns.forEach((c, i) => doc.text(c.header, 40 + i * colWidth, doc.y, { width: colWidth, continued: i < columns.length - 1 }));
    doc.moveDown();
    doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();

    rows.forEach((row) => {
      doc.moveDown(0.3);
      const y = doc.y;
      columns.forEach((c, i) => doc.text(String(row[c.key] ?? ''), 40 + i * colWidth, y, { width: colWidth }));
    });

    doc.end();
  });
}

async function sendExport(res, { format, columns, rows, filename, title }) {
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.send(toCsv(columns, rows));
  }
  if (format === 'excel') {
    const buffer = await toExcelBuffer(columns, rows, title);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    return res.send(buffer);
  }
  if (format === 'pdf') {
    const buffer = await toPdfBuffer(columns, rows, title);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
    return res.send(buffer);
  }
  return null; // caller falls back to JSON via ApiResponse
}

module.exports = { toCsv, toExcelBuffer, toPdfBuffer, sendExport };
