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

beforeEach(async () => {
  await db.clearDatabase();
  await seedPermissionsAndRoles();
});

describe('Auth', () => {
  test('login succeeds with correct credentials and returns a resolved permission set', async () => {
    await createUser({ email: 'admin@test.local', roleName: ROLES.SUPER_ADMIN });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.local', password: 'Password@123' });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.permissions).toEqual(expect.arrayContaining(['payment_voucher:approve']));
  });

  test('login fails with wrong password', async () => {
    await createUser({ email: 'admin@test.local', roleName: ROLES.SUPER_ADMIN });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.local', password: 'WrongPassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('protected route rejects requests with no token', async () => {
    const res = await request(app).get('/api/v1/users');
    expect(res.status).toBe(401);
  });

  test('refresh token rotation issues a new working access token', async () => {
    await createUser({ email: 'admin@test.local', roleName: ROLES.SUPER_ADMIN });
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'admin@test.local', password: 'Password@123' });

    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh-token')
      .send({ refreshToken: login.body.data.refreshToken });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeDefined();

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${refreshRes.body.data.accessToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe('admin@test.local');
  });

  test('the old refresh token is revoked after rotation', async () => {
    await createUser({ email: 'admin@test.local', roleName: ROLES.SUPER_ADMIN });
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'admin@test.local', password: 'Password@123' });

    await request(app).post('/api/v1/auth/refresh-token').send({ refreshToken: login.body.data.refreshToken });

    const reuseRes = await request(app)
      .post('/api/v1/auth/refresh-token')
      .send({ refreshToken: login.body.data.refreshToken });

    expect(reuseRes.status).toBe(401);
  });

  test('change-password rejects a wrong current password and succeeds with the right one', async () => {
    await createUser({ email: 'admin@test.local', roleName: ROLES.SUPER_ADMIN });
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'admin@test.local', password: 'Password@123' });
    const token = login.body.data.accessToken;

    const wrongRes = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'WrongPassword', newPassword: 'NewPassword@123' });
    expect(wrongRes.status).toBe(401);

    const rightRes = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Password@123', newPassword: 'NewPassword@123' });
    expect(rightRes.status).toBe(200);

    const loginWithNewPassword = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.local', password: 'NewPassword@123' });
    expect(loginWithNewPassword.status).toBe(200);
  });
});
