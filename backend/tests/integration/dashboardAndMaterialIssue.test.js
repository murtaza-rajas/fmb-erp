const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const db = require('../helpers/db');
const { seedPermissionsAndRoles, createUser, ROLES } = require('../helpers/seed');
const Category = require('../../src/models/Category.model');
const Unit = require('../../src/models/Unit.model');
const Store = require('../../src/models/Store.model');
const Item = require('../../src/models/Item.model');
const Vendor = require('../../src/models/Vendor.model');
const PurchaseOrder = require('../../src/models/PurchaseOrder.model');
const { PO_STATUS } = require('../../src/constants/enums');

beforeAll(async () => {
  await db.connect();
});

afterAll(async () => {
  await db.closeDatabase();
});

let token;
let storeId;
let itemId;
let vendorId;

beforeEach(async () => {
  await db.clearDatabase();
  await seedPermissionsAndRoles();
  await createUser({ email: 'admin@test.local', roleName: ROLES.SUPER_ADMIN });
  const login = await request(app).post('/api/v1/auth/login').send({ email: 'admin@test.local', password: 'Password@123' });
  token = login.body.data.accessToken;

  const category = await Category.create({ name: 'Cat' });
  const unit = await Unit.create({ name: 'Unit', symbol: 'u' });
  const store = await Store.create({ name: 'Store' });
  const item = await Item.create({ name: 'Item', sku: 'SKU-1', categoryId: category._id, unitId: unit._id, reorderLevel: 10, standardRate: 50 });
  const vendor = await Vendor.create({ name: 'Vendor' });

  storeId = store._id.toString();
  itemId = item._id.toString();
  vendorId = vendor._id.toString();
});

async function createPoWithStatus(status, amount = 100) {
  return PurchaseOrder.create({
    poNumber: `PO-TEST-${status}-${new mongoose.Types.ObjectId()}`,
    prnId: new mongoose.Types.ObjectId(),
    vendorId,
    items: [{ itemId, quantity: 2, rate: amount / 2, amount }],
    totalAmount: amount,
    status,
    issuedAt: status === PO_STATUS.DRAFT ? undefined : new Date(),
  });
}

describe('Dashboard: pending purchase orders and lifecycle breakdown', () => {
  test('summary.pendingPurchaseOrders counts draft/issued/partially_received only', async () => {
    await createPoWithStatus(PO_STATUS.DRAFT, 100);
    await createPoWithStatus(PO_STATUS.ISSUED, 200);
    await createPoWithStatus(PO_STATUS.PARTIALLY_RECEIVED, 300);
    await createPoWithStatus(PO_STATUS.RECEIVED, 400);
    await createPoWithStatus(PO_STATUS.PAID, 500);
    await createPoWithStatus(PO_STATUS.CLOSED, 600);
    await createPoWithStatus(PO_STATUS.CANCELLED, 700);

    const res = await request(app).get('/api/v1/dashboard/summary').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.pendingPurchaseOrders).toEqual({ count: 3, totalAmount: 600 });
  });

  test('po-status-breakdown reports every status, including zero-count ones', async () => {
    await createPoWithStatus(PO_STATUS.DRAFT, 100);
    await createPoWithStatus(PO_STATUS.ISSUED, 200);

    const res = await request(app).get('/api/v1/dashboard/po-status-breakdown').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(Object.values(PO_STATUS).length);

    const byStatus = Object.fromEntries(res.body.data.map((r) => [r.status, r]));
    expect(byStatus[PO_STATUS.DRAFT]).toEqual({ status: PO_STATUS.DRAFT, count: 1, totalAmount: 100 });
    expect(byStatus[PO_STATUS.ISSUED]).toEqual({ status: PO_STATUS.ISSUED, count: 1, totalAmount: 200 });
    expect(byStatus[PO_STATUS.PAID]).toEqual({ status: PO_STATUS.PAID, count: 0, totalAmount: 0 });
  });
});

describe('Material Issue Voucher', () => {
  async function receiveStock(quantity) {
    // Directly post a stock adjustment (STOCK_ADJUST) to get real stock into
    // the store/item without going through the full PRN->PO->GRN chain.
    const res = await request(app)
      .post('/api/v1/inventory/adjustments')
      .set('Authorization', `Bearer ${token}`)
      .send({ storeId, itemId, quantity, reason: 'Test stock-in' });
    expect(res.status).toBe(201);
  }

  test('rejects issuing more than the available stock balance', async () => {
    await receiveStock(10);

    const res = await request(app)
      .post('/api/v1/inventory/material-issues')
      .set('Authorization', `Bearer ${token}`)
      .send({ storeId, category: 'fmb', thaaliCount: 50, items: [{ itemId, quantity: 20 }] });

    expect(res.status).toBe(409);
  });

  test('successfully issuing material reduces the stock ledger balance and computes cost', async () => {
    await receiveStock(100);

    const res = await request(app)
      .post('/api/v1/inventory/material-issues')
      .set('Authorization', `Bearer ${token}`)
      .send({ storeId, category: 'safar_thaali', thaaliCount: 40, items: [{ itemId, quantity: 30 }] });

    expect(res.status).toBe(201);
    expect(res.body.data.totalCost).toBe(30 * 50); // standardRate = 50
    expect(res.body.data.voucherNumber).toMatch(/^MIV-/);

    const balanceRes = await request(app)
      .get(`/api/v1/inventory/stock-balance?itemId=${itemId}&storeId=${storeId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(balanceRes.body.data.quantity).toBe(70);
  });

  test('feeds the Thaali Cost Report grouped by category', async () => {
    await receiveStock(100);
    await request(app)
      .post('/api/v1/inventory/material-issues')
      .set('Authorization', `Bearer ${token}`)
      .send({ storeId, category: 'event', thaaliCount: 20, items: [{ itemId, quantity: 10 }] });

    const res = await request(app)
      .get('/api/v1/reports/thaali-cost')
      .query({ category: 'event', groupBy: 'month' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      category: 'event',
      thaaliCount: 20,
      totalCost: 10 * 50,
      costPerThaali: (10 * 50) / 20,
    });
  });

  test('returns costPerThaali as null when thaaliCount is zero for a period', async () => {
    await receiveStock(100);
    await request(app)
      .post('/api/v1/inventory/material-issues')
      .set('Authorization', `Bearer ${token}`)
      .send({ storeId, category: 'fmb', thaaliCount: 0, items: [{ itemId, quantity: 5 }] });

    const res = await request(app)
      .get('/api/v1/reports/thaali-cost')
      .query({ category: 'fmb' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].costPerThaali).toBeNull();
  });
});

describe('Material Issue Voucher list search — by voucherNumber or item name', () => {
  test('search matches on the voucher number or an item on it', async () => {
    await request(app)
      .post('/api/v1/inventory/adjustments')
      .set('Authorization', `Bearer ${token}`)
      .send({ storeId, itemId, quantity: 100, reason: 'Test stock-in' });

    const createRes = await request(app)
      .post('/api/v1/inventory/material-issues')
      .set('Authorization', `Bearer ${token}`)
      .send({ storeId, category: 'fmb', thaaliCount: 40, items: [{ itemId, quantity: 10 }] });
    const voucherNumber = createRes.body.data.voucherNumber;

    const byVoucherNumber = await request(app).get(`/api/v1/inventory/material-issues?search=${voucherNumber}`).set('Authorization', `Bearer ${token}`);
    expect(byVoucherNumber.body.data).toHaveLength(1);

    const byItemName = await request(app).get('/api/v1/inventory/material-issues?search=Item').set('Authorization', `Bearer ${token}`);
    expect(byItemName.body.data).toHaveLength(1);

    const noMatch = await request(app).get('/api/v1/inventory/material-issues?search=NOTHING-MATCHES-THIS').set('Authorization', `Bearer ${token}`);
    expect(noMatch.body.data).toHaveLength(0);
  });
});

describe('Stock Adjustment list search — by reason or item name', () => {
  test('search matches on the adjustment reason or the item name', async () => {
    await request(app)
      .post('/api/v1/inventory/adjustments')
      .set('Authorization', `Bearer ${token}`)
      .send({ storeId, itemId, quantity: 10, reason: 'Cycle count correction' });

    const byReason = await request(app).get('/api/v1/inventory/adjustments?search=Cycle').set('Authorization', `Bearer ${token}`);
    expect(byReason.body.data).toHaveLength(1);

    const byItemName = await request(app).get('/api/v1/inventory/adjustments?search=Item').set('Authorization', `Bearer ${token}`);
    expect(byItemName.body.data).toHaveLength(1);

    const noMatch = await request(app).get('/api/v1/inventory/adjustments?search=NOTHING-MATCHES-THIS').set('Authorization', `Bearer ${token}`);
    expect(noMatch.body.data).toHaveLength(0);
  });
});
