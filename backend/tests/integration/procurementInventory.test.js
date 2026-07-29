const request = require('supertest');
const app = require('../../src/app');
const db = require('../helpers/db');
const { seedPermissionsAndRoles, createUser, ROLES } = require('../helpers/seed');
const Category = require('../../src/models/Category.model');
const Unit = require('../../src/models/Unit.model');
const Store = require('../../src/models/Store.model');
const Item = require('../../src/models/Item.model');
const Vendor = require('../../src/models/Vendor.model');

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

async function createIssuedPo(quantity) {
  const prnRes = await request(app)
    .post('/api/v1/procurement/requisitions')
    .set('Authorization', `Bearer ${token}`)
    .send({ storeId, items: [{ itemId, quantity, neededByDate: '2026-08-01' }] });

  const poRes = await request(app)
    .post('/api/v1/procurement/purchase-orders')
    .set('Authorization', `Bearer ${token}`)
    .send({ prnId: prnRes.body.data._id, vendorId, items: [{ itemId, quantity, rate: 50 }] });

  await request(app).patch(`/api/v1/procurement/purchase-orders/${poRes.body.data._id}/issue`).set('Authorization', `Bearer ${token}`);

  return { prnId: prnRes.body.data._id, poId: poRes.body.data._id };
}

describe('Procurement: PRN to PO conversion', () => {
  test('creating a PO atomically marks the PRN as converted_to_po', async () => {
    const { prnId, poId } = await createIssuedPo(10);

    const prnRes = await request(app).get(`/api/v1/procurement/requisitions/${prnId}`).set('Authorization', `Bearer ${token}`);
    expect(prnRes.body.data.status).toBe('converted_to_po');

    const poRes = await request(app).get(`/api/v1/procurement/purchase-orders/${poId}`).set('Authorization', `Bearer ${token}`);
    expect(poRes.body.data.status).toBe('issued');
  });

  test('a PRN cannot be converted to a PO twice', async () => {
    const { prnId } = await createIssuedPo(10);

    const secondPoRes = await request(app)
      .post('/api/v1/procurement/purchase-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ prnId, vendorId, items: [{ itemId, quantity: 10, rate: 50 }] });

    expect(secondPoRes.status).toBe(409);
  });
});

describe('Inventory: GRN over-receipt guard (regression test)', () => {
  test('rejects a GRN that would receive more than the remaining ordered quantity, across multiple GRNs', async () => {
    const { poId } = await createIssuedPo(100);

    // First GRN: 70 received, 10 rejected — 80 accounted for, 20 remaining.
    const grn1 = await request(app)
      .post('/api/v1/inventory/grns')
      .set('Authorization', `Bearer ${token}`)
      .send({ poId, storeId, items: [{ itemId, receivedQty: 70, rejectedQty: 10, rejectionReason: 'damaged' }] });
    expect(grn1.status).toBe(201);
    expect(grn1.body.data.poStatus).toBe('partially_received');

    // Second GRN attempts 25 when only 20 remain — must be rejected.
    const grn2 = await request(app)
      .post('/api/v1/inventory/grns')
      .set('Authorization', `Bearer ${token}`)
      .send({ poId, storeId, items: [{ itemId, receivedQty: 25, rejectedQty: 0 }] });
    expect(grn2.status).toBe(400);

    // Exactly the remaining 20 succeeds and closes out the PO.
    const grn3 = await request(app)
      .post('/api/v1/inventory/grns')
      .set('Authorization', `Bearer ${token}`)
      .send({ poId, storeId, items: [{ itemId, receivedQty: 20, rejectedQty: 0 }] });
    expect(grn3.status).toBe(201);
    expect(grn3.body.data.poStatus).toBe('received');

    // Stock ledger balance must reflect only accepted (non-rejected) quantity: 70 + 20 = 90.
    const balanceRes = await request(app)
      .get(`/api/v1/inventory/stock-balance?itemId=${itemId}&storeId=${storeId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(balanceRes.body.data.quantity).toBe(90);

    // Rejected quantity must have produced a debit note.
    const dnRes = await request(app).get('/api/v1/inventory/debit-notes').set('Authorization', `Bearer ${token}`);
    expect(dnRes.body.data).toHaveLength(1);
    expect(dnRes.body.data[0].totalAmount).toBe(10 * 50);
  });

  test('further GRNs against a fully-received PO are rejected', async () => {
    const { poId } = await createIssuedPo(10);
    await request(app)
      .post('/api/v1/inventory/grns')
      .set('Authorization', `Bearer ${token}`)
      .send({ poId, storeId, items: [{ itemId, receivedQty: 10, rejectedQty: 0 }] });

    const res = await request(app)
      .post('/api/v1/inventory/grns')
      .set('Authorization', `Bearer ${token}`)
      .send({ poId, storeId, items: [{ itemId, receivedQty: 1, rejectedQty: 0 }] });

    expect(res.status).toBe(409);
  });
});

describe('Item deletion guard (regression test)', () => {
  test('blocks deleting an item still referenced on an open (non-closed/cancelled) PO', async () => {
    await createIssuedPo(10);

    const res = await request(app).delete(`/api/v1/masters/items/${itemId}`).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
  });

  test('allows deleting an item once its only PO is fully received and closed', async () => {
    const { poId } = await createIssuedPo(10);
    await request(app)
      .post('/api/v1/inventory/grns')
      .set('Authorization', `Bearer ${token}`)
      .send({ poId, storeId, items: [{ itemId, receivedQty: 10, rejectedQty: 0 }] });

    const res = await request(app).delete(`/api/v1/masters/items/${itemId}`).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  test('allows deleting an item with no PO references at all', async () => {
    const res = await request(app).delete(`/api/v1/masters/items/${itemId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
