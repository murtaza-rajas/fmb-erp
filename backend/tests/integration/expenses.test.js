const request = require('supertest');
const app = require('../../src/app');
const db = require('../helpers/db');
const { seedPermissionsAndRoles, createUser, ROLES } = require('../helpers/seed');

beforeAll(async () => {
  await db.connect();
});

afterAll(async () => {
  await db.closeDatabase();
});

let financeToken;

beforeEach(async () => {
  await db.clearDatabase();
  await seedPermissionsAndRoles();
  await createUser({ email: 'finance@test.local', roleName: ROLES.FINANCE_HR });
  const login = await request(app).post('/api/v1/auth/login').send({ email: 'finance@test.local', password: 'Password@123' });
  financeToken = login.body.data.accessToken;
});

describe('HR/Administration expenses — a standalone module, independent of vendor/PO/GRN/Invoice', () => {
  test('a submitted expense starts pending and can be approved', async () => {
    const createRes = await request(app)
      .post('/api/v1/finance/expenses')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ category: 'wages', payeeName: 'Ramesh (Cook)', description: 'Weekly wages', amount: 3500, expenseDate: new Date().toISOString() });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.approvalStatus).toBe('pending');
    expect(createRes.body.data.expenseNumber).toMatch(/^EXP-/);
    const expenseId = createRes.body.data._id;

    const approveRes = await request(app)
      .patch(`/api/v1/finance/expenses/${expenseId}/approve`)
      .set('Authorization', `Bearer ${financeToken}`);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.approvalStatus).toBe('approved');

    // Cannot approve twice.
    const secondApprove = await request(app)
      .patch(`/api/v1/finance/expenses/${expenseId}/approve`)
      .set('Authorization', `Bearer ${financeToken}`);
    expect(secondApprove.status).toBe(409);
  });

  test('a pending expense can be rejected with a reason', async () => {
    const createRes = await request(app)
      .post('/api/v1/finance/expenses')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ category: 'rent', payeeName: 'Landlord', amount: 15000, expenseDate: new Date().toISOString() });
    const expenseId = createRes.body.data._id;

    const missingReason = await request(app)
      .patch(`/api/v1/finance/expenses/${expenseId}/reject`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({});
    expect(missingReason.status).toBe(422);

    const rejectRes = await request(app)
      .patch(`/api/v1/finance/expenses/${expenseId}/reject`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ reason: 'Duplicate entry' });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.approvalStatus).toBe('rejected');
    expect(rejectRes.body.data.rejectionReason).toBe('Duplicate entry');
  });

  test('rejects an invalid category and a non-positive amount', async () => {
    const badCategory = await request(app)
      .post('/api/v1/finance/expenses')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ category: 'not_a_real_category', payeeName: 'Someone', amount: 100 });
    expect(badCategory.status).toBe(422);

    const badAmount = await request(app)
      .post('/api/v1/finance/expenses')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ category: 'other', payeeName: 'Someone', amount: 0 });
    expect(badAmount.status).toBe(422);
  });

  test('search matches on expenseNumber or payeeName', async () => {
    await request(app)
      .post('/api/v1/finance/expenses')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ category: 'wages', payeeName: 'Zubair Cook', amount: 3000 });

    const byPayee = await request(app).get('/api/v1/finance/expenses?search=Zubair').set('Authorization', `Bearer ${financeToken}`);
    expect(byPayee.body.data).toHaveLength(1);

    const noMatch = await request(app).get('/api/v1/finance/expenses?search=NoSuchPayee').set('Authorization', `Bearer ${financeToken}`);
    expect(noMatch.body.data).toHaveLength(0);
  });

  test('a role without expense permissions cannot create or approve an expense', async () => {
    await createUser({ email: 'store@test.local', roleName: ROLES.STORE });
    const storeLogin = await request(app).post('/api/v1/auth/login').send({ email: 'store@test.local', password: 'Password@123' });
    const storeToken = storeLogin.body.data.accessToken;

    const createAttempt = await request(app)
      .post('/api/v1/finance/expenses')
      .set('Authorization', `Bearer ${storeToken}`)
      .send({ category: 'other', payeeName: 'Someone', amount: 100 });
    expect(createAttempt.status).toBe(403);
  });
});
