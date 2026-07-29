const request = require('supertest');
const app = require('../../src/app');
const db = require('../helpers/db');
const { seedPermissionsAndRoles, createUser, ROLES } = require('../helpers/seed');
const Category = require('../../src/models/Category.model');
const Unit = require('../../src/models/Unit.model');
const Store = require('../../src/models/Store.model');
const Item = require('../../src/models/Item.model');

beforeAll(async () => {
  await db.connect();
});

afterAll(async () => {
  await db.closeDatabase();
});

let token;
let storeId;
let itemId;

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
  storeId = store._id.toString();
  itemId = item._id.toString();
});

describe('Vendor: GST/FSSAI fields and certificate uploads', () => {
  test('creates a vendor with GST/FSSAI numbers and certificate fileKeys', async () => {
    const res = await request(app)
      .post('/api/v1/masters/vendors')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Acme Foods',
        gstNumber: '27ABCDE1234F1Z5',
        fssaiNumber: '12345678901234',
        gstCertificateFileKey: 'vendor/2026/07/gst-cert.pdf',
        fssaiCertificateFileKey: 'vendor/2026/07/fssai-cert.pdf',
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      gstNumber: '27ABCDE1234F1Z5',
      fssaiNumber: '12345678901234',
      gstCertificateFileKey: 'vendor/2026/07/gst-cert.pdf',
      fssaiCertificateFileKey: 'vendor/2026/07/fssai-cert.pdf',
    });
  });

  test('allows omitting GST/FSSAI fields entirely (still optional)', async () => {
    const res = await request(app).post('/api/v1/masters/vendors').set('Authorization', `Bearer ${token}`).send({ name: 'No GST Vendor' });
    expect(res.status).toBe(201);
  });

  test('accepts "vendor" as a valid upload module for presigned uploads', async () => {
    const res = await request(app)
      .post('/api/v1/uploads/presign')
      .set('Authorization', `Bearer ${token}`)
      .send({ module: 'vendor', fileName: 'gst-cert.pdf', contentType: 'application/pdf' });

    // AWS isn't configured in the test environment, so the request fails
    // downstream at assertStorageConfigured() (500) — the important thing is
    // it is NOT rejected by the module allowlist (400/422).
    expect(res.status).not.toBe(400);
    expect(res.status).not.toBe(422);
  });

  test('still rejects an unrecognized upload module', async () => {
    const res = await request(app)
      .post('/api/v1/uploads/presign')
      .set('Authorization', `Bearer ${token}`)
      .send({ module: 'not_a_real_module', fileName: 'x.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(422);
  });
});

describe('ThaaliBudget master', () => {
  test('normalizes weekStartDate to the Monday of that ISO week', async () => {
    // 2026-07-30 is a Thursday; the ISO week's Monday is 2026-07-27.
    const res = await request(app)
      .post('/api/v1/masters/thaali-budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'fmb', weekStartDate: '2026-07-30', amount: 5000 });

    expect(res.status).toBe(201);
    expect(new Date(res.body.data.weekStartDate).toISOString().slice(0, 10)).toBe('2026-07-27');
  });

  test('rejects a duplicate category+week combination', async () => {
    await request(app)
      .post('/api/v1/masters/thaali-budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'fmb', weekStartDate: '2026-07-27', amount: 5000 });

    const res = await request(app)
      .post('/api/v1/masters/thaali-budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'fmb', weekStartDate: '2026-07-30', amount: 6000 }); // same ISO week

    expect(res.status).toBe(409);
  });
});

describe('Thaali Cost Report: budget vs actual', () => {
  async function receiveStock(quantity) {
    const res = await request(app)
      .post('/api/v1/inventory/adjustments')
      .set('Authorization', `Bearer ${token}`)
      .send({ storeId, itemId, quantity, reason: 'Test stock-in' });
    expect(res.status).toBe(201);
  }

  test('joins budget and computes variance for a period with actual cost', async () => {
    await request(app)
      .post('/api/v1/masters/thaali-budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'fmb', weekStartDate: '2026-07-27', amount: 2000 });

    await receiveStock(100);
    await request(app)
      .post('/api/v1/inventory/material-issues')
      .set('Authorization', `Bearer ${token}`)
      .send({ storeId, category: 'fmb', thaaliCount: 30, issueDate: '2026-07-28', items: [{ itemId, quantity: 10 }] }); // cost = 500

    const res = await request(app)
      .get('/api/v1/reports/thaali-cost')
      .query({ category: 'fmb', groupBy: 'week' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ totalCost: 500, budget: 2000, variance: 1500 });
  });

  test('shows a budget-only row (zero actual cost) when no vouchers exist for that week', async () => {
    await request(app)
      .post('/api/v1/masters/thaali-budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'event', weekStartDate: '2026-07-27', amount: 1000 });

    const res = await request(app)
      .get('/api/v1/reports/thaali-cost')
      .query({ category: 'event', groupBy: 'week' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ totalCost: 0, thaaliCount: 0, budget: 1000, variance: 1000 });
  });

  test('returns null budget/variance for a period with cost but no budget entered', async () => {
    await receiveStock(100);
    await request(app)
      .post('/api/v1/inventory/material-issues')
      .set('Authorization', `Bearer ${token}`)
      .send({ storeId, category: 'safar_thaali', thaaliCount: 10, items: [{ itemId, quantity: 5 }] });

    const res = await request(app)
      .get('/api/v1/reports/thaali-cost')
      .query({ category: 'safar_thaali' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].budget).toBeNull();
    expect(res.body.data[0].variance).toBeNull();
  });
});
