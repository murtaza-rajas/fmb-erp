const dayjs = require('dayjs');
const isoWeek = require('dayjs/plugin/isoWeek');
const PurchaseOrder = require('../models/PurchaseOrder.model');
const Payment = require('../models/Payment.model');
const AuditLog = require('../models/AuditLog.model');
const Item = require('../models/Item.model');
const MaterialIssueVoucher = require('../models/MaterialIssueVoucher.model');
const ThaaliBudget = require('../models/ThaaliBudget.model');
const dashboardService = require('./dashboard.service');
const stockLedgerService = require('./stockLedger.service');

dayjs.extend(isoWeek);

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

function periodKeyForDate(date, groupBy) {
  const d = dayjs(date);
  return groupBy === 'month'
    ? `${d.year()}-${String(d.month() + 1).padStart(2, '0')}`
    : `${d.isoWeekYear()}-W${String(d.isoWeek()).padStart(2, '0')}`;
}

// Weekly/monthly cost-per-thaali rollup, grouped by category — the cost side
// is derived entirely from MaterialIssueVoucher (the one real stock-out
// transaction; no separate stock-neutral entry exists, per the client's
// confirmed design). Budget is a separate, independently-entered figure
// (ThaaliBudget, always stored as a per-week amount) joined in here so the
// report can show budget vs actual — a monthly budget is the sum of the
// weekly budgets whose Monday falls in that month, not a separately entered
// number, per the client's confirmed choice.
async function getThaaliCostReport({ from, to, category, groupBy = 'week' }) {
  const costMatch = { isDeleted: false, ...dateRangeFilter('issueDate', { from, to }) };
  if (category) costMatch.category = category;

  const periodFields = groupBy === 'month'
    ? { year: { $year: '$issueDate' }, month: { $month: '$issueDate' } }
    : { year: { $isoWeekYear: '$issueDate' }, week: { $isoWeek: '$issueDate' } };

  const costRows = await MaterialIssueVoucher.aggregate([
    { $match: costMatch },
    {
      $group: {
        _id: { category: '$category', ...periodFields },
        totalCost: { $sum: '$totalCost' },
        thaaliCount: { $sum: '$thaaliCount' },
        voucherCount: { $sum: 1 },
      },
    },
  ]);

  const costMap = new Map();
  for (const r of costRows) {
    const period = groupBy === 'month'
      ? `${r._id.year}-${String(r._id.month).padStart(2, '0')}`
      : `${r._id.year}-W${String(r._id.week).padStart(2, '0')}`;
    costMap.set(`${r._id.category}|${period}`, { totalCost: r.totalCost, thaaliCount: r.thaaliCount, voucherCount: r.voucherCount });
  }

  const budgetMatch = { isDeleted: false, ...dateRangeFilter('weekStartDate', { from, to }) };
  if (category) budgetMatch.category = category;
  const budgets = await ThaaliBudget.find(budgetMatch);

  const budgetMap = new Map();
  for (const b of budgets) {
    const key = `${b.category}|${periodKeyForDate(b.weekStartDate, groupBy)}`;
    budgetMap.set(key, (budgetMap.get(key) || 0) + b.amount);
  }

  const allKeys = new Set([...costMap.keys(), ...budgetMap.keys()]);

  const rows = [...allKeys].map((key) => {
    const [rowCategory, period] = key.split('|');
    const cost = costMap.get(key) || { totalCost: 0, thaaliCount: 0, voucherCount: 0 };
    const budget = budgetMap.has(key) ? budgetMap.get(key) : null;

    return {
      category: rowCategory,
      period,
      totalCost: cost.totalCost,
      thaaliCount: cost.thaaliCount,
      voucherCount: cost.voucherCount,
      costPerThaali: cost.thaaliCount > 0 ? Number((cost.totalCost / cost.thaaliCount).toFixed(2)) : null,
      budget,
      variance: budget != null ? Number((budget - cost.totalCost).toFixed(2)) : null,
    };
  });

  rows.sort((a, b) => (a.period === b.period ? a.category.localeCompare(b.category) : a.period.localeCompare(b.period)));

  return rows;
}

module.exports = {
  getPurchaseReport,
  getVendorReport,
  getInventoryReport,
  getStockLedgerReport,
  getPaymentReport,
  getAuditReport,
  getUserActivityReport,
  getThaaliCostReport,
};
