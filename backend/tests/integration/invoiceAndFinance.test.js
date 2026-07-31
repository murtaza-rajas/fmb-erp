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
  const item = await Item.create({ name: 'Item', sku: 'SKU-1', categoryId: category._id, unitId: unit._id, reorderLevel: 10, standardRate: 100 });
  const vendor = await Vendor.create({ name: 'Vendor' });

  storeId = store._id.toString();
  itemId = item._id.toString();
  vendorId = vendor._id.toString();
});

async function createFullyReceivedPo(quantity, rate) {
  const prnRes = await request(app)
    .post('/api/v1/procurement/requisitions')
    .set('Authorization', `Bearer ${token}`)
    .send({ storeId, items: [{ itemId, quantity, neededByDate: '2026-08-01' }] });

  const poRes = await request(app)
    .post('/api/v1/procurement/purchase-orders')
    .set('Authorization', `Bearer ${token}`)
    .send({ prnId: prnRes.body.data._id, vendorId, items: [{ itemId, quantity, rate }] });
  const poId = poRes.body.data._id;

  await request(app).patch(`/api/v1/procurement/purchase-orders/${poId}/issue`).set('Authorization', `Bearer ${token}`);

  const grnRes = await request(app)
    .post('/api/v1/inventory/grns')
    .set('Authorization', `Bearer ${token}`)
    .send({ poId, storeId, items: [{ itemId, receivedQty: quantity, rejectedQty: 0 }] });

  return { poId, grnId: grnRes.body.data.grn._id };
}

describe('Invoice three-way matching', () => {
  test('an invoice matching PO rate and GRN quantity is marked matched and advances the PO', async () => {
    const { poId, grnId } = await createFullyReceivedPo(10, 100);

    const invRes = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({ invoiceNumber: 'INV-1', vendorId, poId, grnId, items: [{ itemId, quantity: 10, rate: 100 }] });

    const matchRes = await request(app).post(`/api/v1/invoices/${invRes.body.data._id}/match`).set('Authorization', `Bearer ${token}`);
    expect(matchRes.body.data.result).toBe('matched');
    expect(matchRes.body.data.discrepancies).toHaveLength(0);

    const poRes = await request(app).get(`/api/v1/procurement/purchase-orders/${poId}`).set('Authorization', `Bearer ${token}`);
    expect(poRes.body.data.status).toBe('invoiced');
  });

  test('an invoice with a different rate and quantity is flagged with both discrepancies and does not advance the PO', async () => {
    const { poId, grnId } = await createFullyReceivedPo(10, 100);

    const invRes = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({ invoiceNumber: 'INV-2', vendorId, poId, grnId, items: [{ itemId, quantity: 8, rate: 110 }] });

    const matchRes = await request(app).post(`/api/v1/invoices/${invRes.body.data._id}/match`).set('Authorization', `Bearer ${token}`);
    expect(matchRes.body.data.result).toBe('mismatched');
    expect(matchRes.body.data.discrepancies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'rate', poValue: 100, invoiceValue: 110 }),
        expect.objectContaining({ field: 'quantity', grnValue: 10, invoiceValue: 8 }),
      ])
    );

    const poRes = await request(app).get(`/api/v1/procurement/purchase-orders/${poId}`).set('Authorization', `Bearer ${token}`);
    expect(poRes.body.data.status).toBe('received');
  });
});

describe('Finance: the SOP guarantee — no payment without a matched PO + GRN + Invoice', () => {
  test('a payment voucher cannot be raised against an unmatched invoice', async () => {
    const { poId, grnId } = await createFullyReceivedPo(10, 100);
    const invRes = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({ invoiceNumber: 'INV-3', vendorId, poId, grnId, items: [{ itemId, quantity: 10, rate: 100 }] });

    const voucherRes = await request(app)
      .post('/api/v1/finance/payment-vouchers')
      .set('Authorization', `Bearer ${token}`)
      .send({ invoiceId: invRes.body.data._id, paymentMode: 'neft' });

    expect(voucherRes.status).toBe(409);
  });

  test('full lifecycle: matched invoice -> voucher -> approve -> pay -> PO closed, vendor ledger nets to zero', async () => {
    const { poId, grnId } = await createFullyReceivedPo(10, 100);
    const invRes = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({ invoiceNumber: 'INV-4', vendorId, poId, grnId, items: [{ itemId, quantity: 10, rate: 100 }] });
    await request(app).post(`/api/v1/invoices/${invRes.body.data._id}/match`).set('Authorization', `Bearer ${token}`);

    const voucherRes = await request(app)
      .post('/api/v1/finance/payment-vouchers')
      .set('Authorization', `Bearer ${token}`)
      .send({ invoiceId: invRes.body.data._id, paymentMode: 'neft' });
    expect(voucherRes.status).toBe(201);
    expect(voucherRes.body.data.amount).toBe(1000);

    const poAfterVoucher = await request(app).get(`/api/v1/procurement/purchase-orders/${poId}`).set('Authorization', `Bearer ${token}`);
    expect(poAfterVoucher.body.data.status).toBe('payment_pending');

    await request(app).patch(`/api/v1/finance/payment-vouchers/${voucherRes.body.data._id}/approve`).set('Authorization', `Bearer ${token}`);

    const paymentRes = await request(app)
      .post('/api/v1/finance/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ voucherId: voucherRes.body.data._id, transactionRef: 'TXN-1' });
    expect(paymentRes.status).toBe(201);

    const poFinal = await request(app).get(`/api/v1/procurement/purchase-orders/${poId}`).set('Authorization', `Bearer ${token}`);
    expect(poFinal.body.data.status).toBe('closed');

    const ledgerRes = await request(app).get(`/api/v1/finance/vendor-ledger/${vendorId}`).set('Authorization', `Bearer ${token}`);
    const finalBalance = ledgerRes.body.data[0].balanceAfter;
    expect(finalBalance).toBe(0);

    const duplicatePayment = await request(app)
      .post('/api/v1/finance/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ voucherId: voucherRes.body.data._id, transactionRef: 'TXN-2' });
    expect(duplicatePayment.status).toBe(409);
  });
});

describe('Match override + debit note waiver — vendor bills full qty despite rejected/damaged goods', () => {
  test('mismatched invoice cannot get a voucher until overridden; waiving the auto-debit-note at approval nets the vendor ledger to zero', async () => {
    const prnRes = await request(app)
      .post('/api/v1/procurement/requisitions')
      .set('Authorization', `Bearer ${token}`)
      .send({ storeId, items: [{ itemId, quantity: 10, neededByDate: '2026-08-01' }] });
    const poRes = await request(app)
      .post('/api/v1/procurement/purchase-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ prnId: prnRes.body.data._id, vendorId, items: [{ itemId, quantity: 10, rate: 100 }] });
    const poId = poRes.body.data._id;
    await request(app).patch(`/api/v1/procurement/purchase-orders/${poId}/issue`).set('Authorization', `Bearer ${token}`);

    // 8 accepted, 2 rejected as damaged — but the vendor still bills for all 10.
    const grnRes = await request(app)
      .post('/api/v1/inventory/grns')
      .set('Authorization', `Bearer ${token}`)
      .send({ poId, storeId, items: [{ itemId, receivedQty: 8, rejectedQty: 2, rejectionReason: 'damaged', remarks: '2kg damaged in transit' }] });
    const grnId = grnRes.body.data.grn._id;
    const debitNoteId = grnRes.body.data.debitNote._id;
    expect(grnRes.body.data.debitNote.totalAmount).toBe(200);

    const invRes = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({ invoiceNumber: 'INV-DAMAGE-1', vendorId, poId, grnId, items: [{ itemId, quantity: 10, rate: 100 }] });
    const invoiceId = invRes.body.data._id;

    const matchRes = await request(app).post(`/api/v1/invoices/${invoiceId}/match`).set('Authorization', `Bearer ${token}`);
    expect(matchRes.body.data.result).toBe('mismatched');

    const blockedVoucher = await request(app)
      .post('/api/v1/finance/payment-vouchers')
      .set('Authorization', `Bearer ${token}`)
      .send({ invoiceId, paymentMode: 'neft' });
    expect(blockedVoucher.status).toBe(409);

    const overrideRes = await request(app)
      .patch(`/api/v1/invoices/${invoiceId}/override-match`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Vendor bills full qty per agreed terms for perishables; 2kg damaged, see GRN remarks' });
    expect(overrideRes.status).toBe(200);
    expect(overrideRes.body.data.matchStatus).toBe('overridden');

    const voucherRes = await request(app)
      .post('/api/v1/finance/payment-vouchers')
      .set('Authorization', `Bearer ${token}`)
      .send({ invoiceId, paymentMode: 'neft' });
    expect(voucherRes.status).toBe(201);
    expect(voucherRes.body.data.amount).toBe(1000);

    await request(app)
      .patch(`/api/v1/finance/payment-vouchers/${voucherRes.body.data._id}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ waivedDebitNoteIds: [debitNoteId] });

    const dnRes = await request(app).get(`/api/v1/inventory/debit-notes/${debitNoteId}`).set('Authorization', `Bearer ${token}`);
    expect(dnRes.body.data.status).toBe('waived');

    await request(app)
      .post('/api/v1/finance/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ voucherId: voucherRes.body.data._id, transactionRef: 'TXN-DAMAGE-1' });

    const poFinal = await request(app).get(`/api/v1/procurement/purchase-orders/${poId}`).set('Authorization', `Bearer ${token}`);
    expect(poFinal.body.data.status).toBe('closed');

    const ledgerRes = await request(app).get(`/api/v1/finance/vendor-ledger/${vendorId}`).set('Authorization', `Bearer ${token}`);
    expect(ledgerRes.body.data[0].balanceAfter).toBe(0);
  });
});
