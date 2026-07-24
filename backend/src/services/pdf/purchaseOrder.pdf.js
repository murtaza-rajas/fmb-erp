const PDFDocument = require('pdfkit');
const dayjs = require('dayjs');

// Renders a Purchase Order to a PDF buffer for print/download and for
// attaching to the vendor email. `po` must have vendorId and items.itemId
// populated (see purchaseOrder.service.js#getPurchaseOrderById).
function generatePurchaseOrderPdf(po) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text('FMB Nagpur', { align: 'left' });
    doc.fontSize(14).text('Purchase Order', { align: 'left' });
    doc.moveDown();

    doc.fontSize(10);
    doc.text(`PO Number: ${po.poNumber}`);
    doc.text(`Status: ${po.status}`);
    doc.text(`Date: ${dayjs(po.createdAt).format('DD-MMM-YYYY')}`);
    if (po.revisionNumber > 0) doc.text(`Revision: ${po.revisionNumber}`);
    doc.moveDown();

    doc.fontSize(12).text('Vendor', { underline: true });
    doc.fontSize(10);
    doc.text(po.vendorId.name);
    if (po.vendorId.phone) doc.text(`Phone: ${po.vendorId.phone}`);
    if (po.vendorId.email) doc.text(`Email: ${po.vendorId.email}`);
    doc.moveDown();

    doc.fontSize(12).text('Items', { underline: true });
    doc.moveDown(0.5);

    const colX = { name: 50, qty: 280, rate: 350, amount: 430 };
    doc.fontSize(10).text('Item', colX.name, doc.y, { continued: false });
    doc.text('Qty', colX.qty, doc.y);
    doc.text('Rate', colX.rate, doc.y);
    doc.text('Amount', colX.amount, doc.y);
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);

    for (const line of po.items) {
      const y = doc.y;
      doc.text(line.itemId?.name || String(line.itemId), colX.name, y, { width: 220 });
      doc.text(String(line.quantity), colX.qty, y);
      doc.text(line.rate.toFixed(2), colX.rate, y);
      doc.text(line.amount.toFixed(2), colX.amount, y);
      doc.moveDown();
    }

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Total Amount: ${po.totalAmount.toFixed(2)}`, { align: 'right' });

    doc.end();
  });
}

module.exports = { generatePurchaseOrderPdf };
