const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const reportService = require('../services/report.service');
const { sendExport } = require('../utils/exportHelper');

const PURCHASE_COLUMNS = [
  { key: 'poNumber', header: 'PO Number' },
  { key: 'vendor', header: 'Vendor' },
  { key: 'status', header: 'Status' },
  { key: 'totalAmount', header: 'Total Amount' },
  { key: 'issuedAt', header: 'Issued At' },
];

const VENDOR_COLUMNS = [
  { key: 'name', header: 'Vendor' },
  { key: 'totalPurchaseOrders', header: 'Total POs' },
  { key: 'totalPurchaseAmount', header: 'Total Purchase Amount' },
  { key: 'totalDebitNotes', header: 'Debit Notes' },
  { key: 'totalDebitAmount', header: 'Debit Amount' },
  { key: 'outstandingBalance', header: 'Outstanding Balance' },
];

const INVENTORY_COLUMNS = [
  { key: 'sku', header: 'SKU' },
  { key: 'name', header: 'Item' },
  { key: 'category', header: 'Category' },
  { key: 'unit', header: 'Unit' },
  { key: 'currentQuantity', header: 'Current Qty' },
  { key: 'reorderLevel', header: 'Reorder Level' },
  { key: 'standardRate', header: 'Standard Rate' },
  { key: 'stockValue', header: 'Stock Value' },
];

const STOCK_LEDGER_COLUMNS = [
  { key: 'date', header: 'Date' },
  { key: 'item', header: 'Item' },
  { key: 'store', header: 'Store' },
  { key: 'transactionType', header: 'Type' },
  { key: 'quantity', header: 'Quantity' },
  { key: 'balanceAfter', header: 'Balance After' },
];

const PAYMENT_COLUMNS = [
  { key: 'voucherNumber', header: 'Voucher Number' },
  { key: 'vendor', header: 'Vendor' },
  { key: 'paidAmount', header: 'Paid Amount' },
  { key: 'paymentMode', header: 'Mode' },
  { key: 'transactionRef', header: 'Transaction Ref' },
  { key: 'paidAt', header: 'Paid At' },
];

const AUDIT_COLUMNS = [
  { key: 'timestamp', header: 'Timestamp' },
  { key: 'user', header: 'User' },
  { key: 'action', header: 'Action' },
  { key: 'module', header: 'Module' },
  { key: 'entityType', header: 'Entity Type' },
  { key: 'entityId', header: 'Entity Id' },
];

const ACTIVITY_COLUMNS = [
  { key: 'timestamp', header: 'Timestamp' },
  { key: 'action', header: 'Action' },
  { key: 'module', header: 'Module' },
  { key: 'entityType', header: 'Entity Type' },
  { key: 'entityId', header: 'Entity Id' },
];

const THAALI_COST_COLUMNS = [
  { key: 'period', header: 'Period' },
  { key: 'category', header: 'Category' },
  { key: 'thaaliCount', header: 'Thaali Count' },
  { key: 'totalCost', header: 'Total Cost' },
  { key: 'costPerThaali', header: 'Cost / Thaali' },
  { key: 'budget', header: 'Budget' },
  { key: 'variance', header: 'Variance (Budget - Cost)' },
];

// Every report follows the same shape: fetch rows, then either stream an
// export (csv/excel/pdf) or return JSON. Export requires report:export,
// enforced by requireExportPermission below rather than duplicated per route.
function buildReportHandler({ getRows, columns, filename, title }) {
  return asyncHandler(async (req, res) => {
    const rows = await getRows(req.query);
    const format = req.query.format;

    if (format) {
      const sent = await sendExport(res, { format, columns, rows, filename, title });
      if (sent) return;
      throw ApiError.badRequest(`Unsupported export format "${format}"`);
    }

    ApiResponse.send(res, { data: rows });
  });
}

const purchases = buildReportHandler({
  getRows: (q) => reportService.getPurchaseReport(q),
  columns: PURCHASE_COLUMNS,
  filename: 'purchase-report',
  title: 'Purchase Report',
});

const vendors = buildReportHandler({
  getRows: () => reportService.getVendorReport(),
  columns: VENDOR_COLUMNS,
  filename: 'vendor-report',
  title: 'Vendor Report',
});

const inventory = buildReportHandler({
  getRows: () => reportService.getInventoryReport(),
  columns: INVENTORY_COLUMNS,
  filename: 'inventory-report',
  title: 'Inventory Report',
});

const stockLedger = buildReportHandler({
  getRows: (q) => reportService.getStockLedgerReport(q),
  columns: STOCK_LEDGER_COLUMNS,
  filename: 'stock-ledger-report',
  title: 'Stock Ledger Report',
});

const payments = buildReportHandler({
  getRows: (q) => reportService.getPaymentReport(q),
  columns: PAYMENT_COLUMNS,
  filename: 'payment-report',
  title: 'Payment Report',
});

const audit = buildReportHandler({
  getRows: (q) => reportService.getAuditReport(q),
  columns: AUDIT_COLUMNS,
  filename: 'audit-report',
  title: 'Audit Report',
});

const userActivity = buildReportHandler({
  getRows: (q) => reportService.getUserActivityReport(q),
  columns: ACTIVITY_COLUMNS,
  filename: 'user-activity-report',
  title: 'User Activity Report',
});

const thaaliCost = buildReportHandler({
  getRows: (q) => reportService.getThaaliCostReport(q),
  columns: THAALI_COST_COLUMNS,
  filename: 'thaali-cost-report',
  title: 'Thaali Cost Report',
});

module.exports = { purchases, vendors, inventory, stockLedger, payments, audit, userActivity, thaaliCost };
