const dayjs = require('dayjs');
const cache = require('../utils/cache');
const PurchaseOrder = require('../models/PurchaseOrder.model');
const PaymentVoucher = require('../models/PaymentVoucher.model');
const Payment = require('../models/Payment.model');
const Item = require('../models/Item.model');
const DebitNote = require('../models/DebitNote.model');
const Vendor = require('../models/Vendor.model');
const stockLedgerService = require('./stockLedger.service');
const vendorLedgerService = require('./vendorLedger.service');

const SUMMARY_CACHE_KEY = 'dashboard:summary';
const SUMMARY_CACHE_TTL_SECONDS = 60;

async function getSummary() {
  const cached = await cache.safeGet(SUMMARY_CACHE_KEY);
  if (cached) return JSON.parse(cached);

  const startOfDay = dayjs().startOf('day').toDate();

  const [todaysPurchases, pendingApprovals, pendingPaymentAgg, reorderAlerts, items] = await Promise.all([
    PurchaseOrder.aggregate([
      { $match: { issuedAt: { $gte: startOfDay }, isDeleted: false } },
      { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: '$totalAmount' } } },
    ]),
    PaymentVoucher.countDocuments({ approvalStatus: 'pending', isDeleted: false }),
    PaymentVoucher.aggregate([
      { $match: { approvalStatus: { $in: ['pending', 'approved'] }, isDeleted: false } },
      { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } },
    ]),
    stockLedgerService.getReorderAlerts(),
    Item.find({ isActive: true, isDeleted: false }),
  ]);

  const balances = await Promise.all(items.map((item) => stockLedgerService.getTotalBalance(item._id)));
  const inventoryValue = items.reduce((sum, item, i) => sum + balances[i] * item.standardRate, 0);

  const summary = {
    todaysPurchases: { count: todaysPurchases[0]?.count || 0, totalAmount: todaysPurchases[0]?.totalAmount || 0 },
    pendingApprovals,
    pendingPayments: { count: pendingPaymentAgg[0]?.count || 0, totalAmount: pendingPaymentAgg[0]?.totalAmount || 0 },
    lowStock: { count: reorderAlerts.length, items: reorderAlerts.map((a) => ({ itemId: a.item._id, name: a.item.name, currentQuantity: a.currentQuantity, reorderLevel: a.item.reorderLevel })) },
    inventoryValue,
    generatedAt: new Date().toISOString(),
  };

  await cache.safeSet(SUMMARY_CACHE_KEY, JSON.stringify(summary), SUMMARY_CACHE_TTL_SECONDS);

  return summary;
}

async function getVendorPerformance() {
  const vendors = await Vendor.find({ isDeleted: false });

  return Promise.all(
    vendors.map(async (vendor) => {
      const [poAgg, debitNoteAgg, outstandingBalance] = await Promise.all([
        PurchaseOrder.aggregate([
          { $match: { vendorId: vendor._id, isDeleted: false } },
          { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: '$totalAmount' } } },
        ]),
        DebitNote.aggregate([
          { $match: { vendorId: vendor._id, isDeleted: false } },
          { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: '$totalAmount' } } },
        ]),
        vendorLedgerService.getOutstandingBalance(vendor._id),
      ]);

      return {
        vendorId: vendor._id,
        name: vendor.name,
        totalPurchaseOrders: poAgg[0]?.count || 0,
        totalPurchaseAmount: poAgg[0]?.totalAmount || 0,
        totalDebitNotes: debitNoteAgg[0]?.count || 0,
        totalDebitAmount: debitNoteAgg[0]?.totalAmount || 0,
        outstandingBalance,
      };
    })
  );
}

async function getMonthlyReport({ months = 12 } = {}) {
  const since = dayjs().subtract(months, 'month').startOf('month').toDate();

  const [purchasesByMonth, paymentsByMonth] = await Promise.all([
    PurchaseOrder.aggregate([
      { $match: { issuedAt: { $gte: since }, isDeleted: false } },
      { $group: { _id: { year: { $year: '$issuedAt' }, month: { $month: '$issuedAt' } }, count: { $sum: 1 }, totalAmount: { $sum: '$totalAmount' } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Payment.aggregate([
      { $match: { paidAt: { $gte: since }, isDeleted: false } },
      { $group: { _id: { year: { $year: '$paidAt' }, month: { $month: '$paidAt' } }, count: { $sum: 1 }, totalAmount: { $sum: '$paidAmount' } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
  ]);

  return { purchasesByMonth, paymentsByMonth };
}

module.exports = { getSummary, getVendorPerformance, getMonthlyReport };
