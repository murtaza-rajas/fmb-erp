const PDFDocument = require('pdfkit');
const dayjs = require('dayjs');

// `payment` must have voucherId populated with invoiceId and vendorId
// further populated (see payment.service.js#getPaymentById).
function generatePaymentAdvicePdf(payment) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const voucher = payment.voucherId;
    const vendor = voucher.vendorId;

    doc.fontSize(18).text('FMB Nagpur', { align: 'left' });
    doc.fontSize(14).text('Payment Advice', { align: 'left' });
    doc.moveDown();

    doc.fontSize(10);
    doc.text(`Voucher Number: ${voucher.voucherNumber}`);
    doc.text(`Payment Date: ${dayjs(payment.paidAt).format('DD-MMM-YYYY')}`);
    if (payment.transactionRef) doc.text(`Transaction Ref: ${payment.transactionRef}`);
    doc.text(`Payment Mode: ${voucher.paymentMode.toUpperCase()}`);
    doc.moveDown();

    doc.fontSize(12).text('Paid To', { underline: true });
    doc.fontSize(10);
    doc.text(vendor.name);
    doc.moveDown();

    doc.fontSize(12).text(`Amount Paid: ${payment.paidAmount.toFixed(2)}`, { align: 'right' });

    doc.end();
  });
}

module.exports = { generatePaymentAdvicePdf };
