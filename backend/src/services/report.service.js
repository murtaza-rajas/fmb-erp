const PurchaseOrder = require('../models/PurchaseOrder.model');
const Payment = require('../models/Payment.model');
const AuditLog = require('../models/AuditLog.model');
const Item = require('../models/Item.model');
const dashboardService = require('./dashboard.service');
const stockLedgerService = require('./stockLedger.service');

function dateRangeFilter(field, { from, to }) {
  if (!from && !to) return {};
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) range.$lte = new Date(to);
  return { [field]: range };
}

async function getPurchaseReport({ from, to, vendorId, status }) {
  const filter = { isDeleted: false, ...dateRangeFilter('issuedAt', { from, to }) };
  if (vendorId) filter.vendorId = vendorId;
  if (status) filter.status = status;

  const orders = await PurchaseOrder.find(filter).populate('vendorId').sort({ issuedAt: -1 });

  return orders.map((po) => ({
    poNumber: po.poNumber,
    vendor: po.vendorId?.name,
    status: po.status,
    totalAmount: po.totalAmount,
    issuedAt: po.issuedAt,
  }));
}

async function getVendorReport() {
  return dashboardService.getVendorPerformance();
}

async function getInventoryReport() {
  const items = await Item.find({ isDeleted: false }).populate('categoryId unitId');
  const balances = await Promise.all(items.map((item) => stockLedgerService.getTotalBalance(item._id)));

  return items.map((item, i) => ({
    sku: item.sku,
    name: item.name,
    category: item.categoryId?.name,
    unit: item.unitId?.symbol,
    currentQuantity: balances[i],
    reorderLevel: item.reorderLevel,
    standardRate: item.standardRate,
    stockValue: balances[i] * item.standardRate,
  }));
}

async function getStockLedgerReport({ itemId, storeId, from, to }) {
  const { items } = await stockLedgerService.listLedger({ itemId, storeId, from, to, page: 1, limit: 10000 });
  return items.map((entry) => ({
    date: entry.timestamp,
    item: entry.itemId?.name,
    store: entry.storeId?.name,
    transactionType: entry.transactionType,
    quantity: entry.quantity,
    balanceAfter: entry.balanceAfter,
  }));
}

async function getPaymentReport({ from, to, vendorId }) {
  const filter = { isDeleted: false, ...dateRangeFilter('paidAt', { from, to }) };
  const payments = await Payment.find(filter)
    .populate({ path: 'voucherId', populate: { path: 'vendorId' } })
    .sort({ paidAt: -1 });

  return payments
    .filter((p) => !vendorId || p.voucherId?.vendorId?._id?.toString() === vendorId)
    .map((p) => ({
      voucherNumber: p.voucherId?.voucherNumber,
      vendor: p.voucherId?.vendorId?.name,
      paidAmount: p.paidAmount,
      paymentMode: p.voucherId?.paymentMode,
      transactionRef: p.transactionRef,
      paidAt: p.paidAt,
    }));
}

async function getAuditReport({ from, to, module: moduleName, userId }) {
  const filter = dateRangeFilter('timestamp', { from, to });
  if (moduleName) filter.module = moduleName;
  if (userId) filter.userId = userId;

  const logs = await AuditLog.find(filter).populate('userId', 'name email').sort({ timestamp: -1 }).limit(5000);

  return logs.map((log) => ({
    timestamp: log.timestamp,
    user: log.userId?.name,
    action: log.action,
    module: log.module,
    entityType: log.entityType,
    entityId: log.entityId,
  }));
}

async function getUserActivityReport({ userId, from, to }) {
  const filter = { userId, ...dateRangeFilter('timestamp', { from, to }) };
  const logs = await AuditLog.find(filter).sort({ timestamp: -1 }).limit(2000);

  return logs.map((log) => ({
    timestamp: log.timestamp,
    action: log.action,
    module: log.module,
    entityType: log.entityType,
    entityId: log.entityId,
  }));
}

module.exports = {
  getPurchaseReport,
  getVendorReport,
  getInventoryReport,
  getStockLedgerReport,
  getPaymentReport,
  getAuditReport,
  getUserActivityReport,
};
