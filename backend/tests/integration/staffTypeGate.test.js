const request = require('supertest');
const app = require('../../src/app');
const db = require('../helpers/db');
const Role = require('../../src/models/Role.model');
const { seedPermissionsAndRoles, createUser, ROLES, STAFF_TYPES } = require('../helpers/seed');

// The SOP's hard rule: payment-approval access must be restricted to paid
// staff (FMB's Paid vs Khidmat Gujar structure). See services/helpers/staffTypeGate.js.

beforeAll(async () => {
  await db.connect();
});

afterAll(async () => {
  await db.closeDatabase();
});

let adminToken;

beforeEach(async () => {
  await db.clearDatabase();
  await seedPermissionsAndRoles();
  await createUser({ email: 'admin@test.local', roleName: ROLES.SUPER_ADMIN });
  const login = await request(app).post('/api/v1/auth/login').send({ email: 'admin@test.local', password: 'Password@123' });
  adminToken = login.body.data.accessToken;
});

describe('staffType payment-approval gate', () => {
  test('creating a khidmat_gujar user with the Finance & HR role is rejected', async () => {
    const financeRole = await Role.findOne({ name: ROLES.FINANCE_HR });

    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'KG User',
        email: 'kg@test.local',
        password: 'Password@123',
        roleId: financeRole._id.toString(),
        staffType: STAFF_TYPES.KHIDMAT_GUJAR,
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PAYMENT_APPROVAL_RESTRICTED_TO_PAID_STAFF');
  });

  test('creating a paid user with the Finance & HR role succeeds', async () => {
    const financeRole = await Role.findOne({ name: ROLES.FINANCE_HR });

    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Paid User',
        email: 'paid@test.local',
        password: 'Password@123',
        roleId: financeRole._id.toString(),
        staffType: STAFF_TYPES.PAID,
      });

    expect(res.status).toBe(201);
  });

  test('reassigning an existing khidmat_gujar user to Finance & HR is rejected', async () => {
    const storeRole = await Role.findOne({ name: ROLES.STORE });
    const financeRole = await Role.findOne({ name: ROLES.FINANCE_HR });
    const { user } = await createUser({ email: 'kg2@test.local', roleName: ROLES.STORE, staffType: STAFF_TYPES.KHIDMAT_GUJAR });
    expect(user.roleId.toString()).toBe(storeRole._id.toString());

    const res = await request(app)
      .patch(`/api/v1/users/${user._id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roleId: financeRole._id.toString() });

    expect(res.status).toBe(403);
  });

  test("a payment voucher approval attempt by a khidmat_gujar user is blocked even if their role holds the permission (defense in depth)", async () => {
    const financeRole = await Role.findOne({ name: ROLES.FINANCE_HR });
    const { user } = await createUser({ email: 'kg3@test.local', roleName: ROLES.FINANCE_HR, staffType: STAFF_TYPES.PAID });

    // Simulate staffType changing after role assignment (outside the normal
    // API flow, which the role-assignment gate cannot see).
    const User = require('../../src/models/User.model');
    await User.updateOne({ _id: user._id }, { staffType: STAFF_TYPES.KHIDMAT_GUJAR });

    const login = await request(app).post('/api/v1/auth/login').send({ email: 'kg3@test.local', password: 'Password@123' });

    // No real voucher exists, but the staffType check runs before the
    // not-found check, so this still proves the re-check fires.
    const res = await request(app)
      .patch('/api/v1/finance/payment-vouchers/000000000000000000000000/approve')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PAYMENT_APPROVAL_RESTRICTED_TO_PAID_STAFF');
    expect(financeRole).toBeTruthy();
  });
});
