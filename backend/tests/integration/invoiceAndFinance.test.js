const request = require('supertest');
const app = require('../../src/app');
const db = require('../helpers/db');
const { seedPermissionsAndRoles, createUser, ROLES } = require('../helpers/seed');
const Category = require('../../src/models/Category.model');
const Unit = require('../../src/models/Unit.model');
const Store = require('../../src/models/Store.model');
const Item = require('../../src/models/Item.model');
const Vendor = require('../../src/models/Vendor.model');

// Computed relative to test run time (rather than a fixed literal) so it
// never drifts into the past — a PRN's neededByDate must be on/after its
// requisitionDate (defaults to today), a rule enforced by the validator.
const FAR_FUTURE_NEEDED_BY_DATE = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

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
    .send({ storeId, items: [{ itemId, quantity, neededByDate: FAR_FUTURE_NEEDED_BY_DATE }] });

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
      .send({ invoiceNumber: 'INV-1', vendorId, items: [{ poId, grnId, itemId, quantity: 10, rate: 100 }] });

    const matchRes = await request(app).post(`/api/v1/invoices/${invRes.body.data._id}/match`).set('Authorization', `Bearer ${token}`);
    expect(matchRes.body.data.result).toBe('matched');
    expect(matchRes.body.data.discrepancies).toHaveLength(0);

    const poRes = await request(app).get(`/api/v1/procurement/purchase-orders/${poId}`).set('Authorization', `Bearer ${token}`);
    expect(poRes.body.data.status).toBe('invoiced');
  });

  test('an invoice with a different rate and quantity than the PO/GRN still matches — rate and quantity are always taken from the invoice as final', async () => {
    const { poId, grnId } = await createFullyReceivedPo(10, 100);

    const invRes = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({ invoiceNumber: 'INV-2', vendorId, items: [{ poId, grnId, itemId, quantity: 8, rate: 110 }] });

    const matchRes = await request(app).post(`/api/v1/invoices/${invRes.body.data._id}/match`).set('Authorization', `Bearer ${token}`);
    expect(matchRes.body.data.result).toBe('matched');
    expect(matchRes.body.data.discrepancies).toHaveLength(0);

    const poRes = await request(app).get(`/api/v1/procurement/purchase-orders/${poId}`).set('Authorization', `Bearer ${token}`);
    expect(poRes.body.data.status).toBe('invoiced');
  });
});

describe('Invoice list search — by invoice number, vendor name, or PO number', () => {
  test('search matches on invoiceNumber, vendorId.name, or items.poId.poNumber', async () => {
    const { poId, grnId } = await createFullyReceivedPo(10, 100);
    const poRes = await request(app).get(`/api/v1/procurement/purchase-orders/${poId}`).set('Authorization', `Bearer ${token}`);
    const poNumber = poRes.body.data.poNumber;

    await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({ invoiceNumber: 'SEARCH-TEST-1', vendorId, items: [{ poId, grnId, itemId, quantity: 10, rate: 100 }] });

    const byInvoiceNumber = await request(app).get('/api/v1/invoices?search=SEARCH-TEST').set('Authorization', `Bearer ${token}`);
    expect(byInvoiceNumber.body.data).toHaveLength(1);

    const byVendorName = await request(app).get('/api/v1/invoices?search=Vendor').set('Authorization', `Bearer ${token}`);
    expect(byVendorName.body.data).toHaveLength(1);

    const byPoNumber = await request(app).get(`/api/v1/invoices?search=${poNumber}`).set('Authorization', `Bearer ${token}`);
    expect(byPoNumber.body.data).toHaveLength(1);

    const noMatch = await request(app).get('/api/v1/invoices?search=NOTHING-MATCHES-THIS').set('Authorization', `Bearer ${token}`);
    expect(noMatch.body.data).toHaveLength(0);
  });
});

describe('Finance: the SOP guarantee — no payment without a matched PO + GRN + Invoice', () => {
  test('a payment voucher cannot be raised against an unmatched invoice', async () => {
    const { poId, grnId } = await createFullyReceivedPo(10, 100);
    const invRes = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({ invoiceNumber: 'INV-3', vendorId, items: [{ poId, grnId, itemId, quantity: 10, rate: 100 }] });

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
      .send({ invoiceNumber: 'INV-4', vendorId, items: [{ poId, grnId, itemId, quantity: 10, rate: 100 }] });
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

describe('Debit note waiver — vendor bills full qty despite rejected/damaged goods', () => {
  test('vendor billing the full ordered qty despite damaged goods matches directly (qty is no longer cross-checked against the GRN); waiving the auto-debit-note at approval nets the vendor ledger to zero', async () => {
    const prnRes = await request(app)
      .post('/api/v1/procurement/requisitions')
      .set('Authorization', `Bearer ${token}`)
      .send({ storeId, items: [{ itemId, quantity: 10, neededByDate: FAR_FUTURE_NEEDED_BY_DATE }] });
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
      .send({ invoiceNumber: 'INV-DAMAGE-1', vendorId, items: [{ poId, grnId, itemId, quantity: 10, rate: 100 }] });
    const invoiceId = invRes.body.data._id;

    const matchRes = await request(app).post(`/api/v1/invoices/${invoiceId}/match`).set('Authorization', `Bearer ${token}`);
    expect(matchRes.body.data.result).toBe('matched');

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

describe('Correcting a zero-value invoice after it was already matched', () => {
  test('an invoice matched with a mistaken ₹0 rate can be corrected once — the ledger only gets credited on the correction, not twice', async () => {
    const { poId, grnId } = await createFullyReceivedPo(10, 50); // PO rate is correct at 50

    // Mistakenly entered rate 0 on the invoice itself.
    const invRes = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({ invoiceNumber: 'INV-ZERO-1', vendorId, items: [{ poId, grnId, itemId, quantity: 10, rate: 0 }] });
    const invoiceId = invRes.body.data._id;
    expect(invRes.body.data.totalAmount).toBe(0);

    const matchRes = await request(app).post(`/api/v1/invoices/${invoiceId}/match`).set('Authorization', `Bearer ${token}`);
    expect(matchRes.body.data.result).toBe('matched');

    const ledgerAfterZeroMatch = await request(app).get(`/api/v1/finance/vendor-ledger/${vendorId}`).set('Authorization', `Bearer ${token}`);
    expect(ledgerAfterZeroMatch.body.data[0]?.balanceAfter || 0).toBe(0);

    // Even though matchStatus is already "matched", the zero total makes it
    // editable — correct the rate.
    const fixRes = await request(app)
      .patch(`/api/v1/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ poId, grnId, itemId, quantity: 10, rate: 50 }] });
    expect(fixRes.status).toBe(200);
    expect(fixRes.body.data.totalAmount).toBe(500);

    const ledgerAfterFix = await request(app).get(`/api/v1/finance/vendor-ledger/${vendorId}`).set('Authorization', `Bearer ${token}`);
    expect(ledgerAfterFix.body.data[0].balanceAfter).toBe(500);

    // Now that the invoice carries a real (non-zero) amount, it's locked
    // again — a second edit must not be allowed to desync the ledger further.
    const secondEditAttempt = await request(app)
      .patch(`/api/v1/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ poId, grnId, itemId, quantity: 10, rate: 999 }] });
    expect(secondEditAttempt.status).toBe(409);
  });
});

describe('Consolidated invoices — one invoice covering multiple POs', () => {
  test('a single invoice spanning two POs matches both, advances both PO statuses, and a voucher/payment closes both', async () => {
    const first = await createFullyReceivedPo(10, 100); // 1000
    const second = await createFullyReceivedPo(5, 50); // 250

    const invRes = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        invoiceNumber: 'INV-CONSOLIDATED-1',
        vendorId,
        items: [
          { poId: first.poId, grnId: first.grnId, itemId, quantity: 10, rate: 100 },
          { poId: second.poId, grnId: second.grnId, itemId, quantity: 5, rate: 50 },
        ],
      });
    expect(invRes.status).toBe(201);
    expect(invRes.body.data.totalAmount).toBe(1250);

    const matchRes = await request(app).post(`/api/v1/invoices/${invRes.body.data._id}/match`).set('Authorization', `Bearer ${token}`);
    expect(matchRes.body.data.result).toBe('matched');

    const firstPoAfterMatch = await request(app).get(`/api/v1/procurement/purchase-orders/${first.poId}`).set('Authorization', `Bearer ${token}`);
    const secondPoAfterMatch = await request(app).get(`/api/v1/procurement/purchase-orders/${second.poId}`).set('Authorization', `Bearer ${token}`);
    expect(firstPoAfterMatch.body.data.status).toBe('invoiced');
    expect(secondPoAfterMatch.body.data.status).toBe('invoiced');

    const voucherRes = await request(app)
      .post('/api/v1/finance/payment-vouchers')
      .set('Authorization', `Bearer ${token}`)
      .send({ invoiceId: invRes.body.data._id, paymentMode: 'neft' });
    expect(voucherRes.status).toBe(201);
    expect(voucherRes.body.data.amount).toBe(1250);

    const firstPoAfterVoucher = await request(app).get(`/api/v1/procurement/purchase-orders/${first.poId}`).set('Authorization', `Bearer ${token}`);
    const secondPoAfterVoucher = await request(app).get(`/api/v1/procurement/purchase-orders/${second.poId}`).set('Authorization', `Bearer ${token}`);
    expect(firstPoAfterVoucher.body.data.status).toBe('payment_pending');
    expect(secondPoAfterVoucher.body.data.status).toBe('payment_pending');

    await request(app).patch(`/api/v1/finance/payment-vouchers/${voucherRes.body.data._id}/approve`).set('Authorization', `Bearer ${token}`);
    await request(app)
      .post('/api/v1/finance/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ voucherId: voucherRes.body.data._id, transactionRef: 'TXN-CONSOLIDATED-1' });

    const firstPoFinal = await request(app).get(`/api/v1/procurement/purchase-orders/${first.poId}`).set('Authorization', `Bearer ${token}`);
    const secondPoFinal = await request(app).get(`/api/v1/procurement/purchase-orders/${second.poId}`).set('Authorization', `Bearer ${token}`);
    expect(firstPoFinal.body.data.status).toBe('closed');
    expect(secondPoFinal.body.data.status).toBe('closed');

    const ledgerRes = await request(app).get(`/api/v1/finance/vendor-ledger/${vendorId}`).set('Authorization', `Bearer ${token}`);
    expect(ledgerRes.body.data[0].balanceAfter).toBe(0);
  });

  test('a consolidated invoice cannot mix POs from different vendors', async () => {
    const first = await createFullyReceivedPo(10, 100);

    const otherVendor = await Vendor.create({ name: 'Other Vendor' });
    const prnRes = await request(app)
      .post('/api/v1/procurement/requisitions')
      .set('Authorization', `Bearer ${token}`)
      .send({ storeId, items: [{ itemId, quantity: 5, neededByDate: FAR_FUTURE_NEEDED_BY_DATE }] });
    const poRes = await request(app)
      .post('/api/v1/procurement/purchase-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ prnId: prnRes.body.data._id, vendorId: otherVendor._id.toString(), items: [{ itemId, quantity: 5, rate: 50 }] });
    const otherPoId = poRes.body.data._id;
    await request(app).patch(`/api/v1/procurement/purchase-orders/${otherPoId}/issue`).set('Authorization', `Bearer ${token}`);
    const otherGrnRes = await request(app)
      .post('/api/v1/inventory/grns')
      .set('Authorization', `Bearer ${token}`)
      .send({ poId: otherPoId, storeId, items: [{ itemId, receivedQty: 5, rejectedQty: 0 }] });

    const invRes = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        invoiceNumber: 'INV-MIXED-VENDOR',
        vendorId, // the first PO's vendor
        items: [
          { poId: first.poId, grnId: first.grnId, itemId, quantity: 10, rate: 100 },
          { poId: otherPoId, grnId: otherGrnRes.body.data.grn._id, itemId, quantity: 5, rate: 50 },
        ],
      });
    expect(invRes.status).toBe(400);
  });

  test('a GRN already used on one invoice cannot be reused on another, even a different consolidated invoice', async () => {
    const first = await createFullyReceivedPo(10, 100);
    const second = await createFullyReceivedPo(5, 50);

    await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({ invoiceNumber: 'INV-DUP-A', vendorId, items: [{ poId: first.poId, grnId: first.grnId, itemId, quantity: 10, rate: 100 }] });

    const dupRes = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        invoiceNumber: 'INV-DUP-B',
        vendorId,
        items: [
          { poId: first.poId, grnId: first.grnId, itemId, quantity: 10, rate: 100 },
          { poId: second.poId, grnId: second.grnId, itemId, quantity: 5, rate: 50 },
        ],
      });
    expect(dupRes.status).toBe(409);
  });
});
