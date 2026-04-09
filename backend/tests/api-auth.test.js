const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');

let server;
let client;
let tempDir;
let startServer;

test.before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drams-api-test-'));

  process.env.DRAMS_DISABLE_LEGACY_SEED = 'true';
  process.env.DRAMS_SQLITE_PATH = path.join(tempDir, 'test.sqlite');
  process.env.PORT = '0';

  ({ startServer } = require('../server'));
  server = await startServer();
  client = request(server);
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

async function registerUser(payload = {}) {
  const user = {
    fullName: payload.fullName || 'Test Operator',
    email: payload.email || `operator-${Date.now()}@drams.local`,
    username: payload.username || `operator${Date.now()}`,
    password: payload.password || 'test-pass-123',
  };

  const res = await client.post('/api/auth/register').send(user);
  return { user, res };
}

async function loginUser(user) {
  const res = await client.post('/api/auth/login').send({
    username: user.username,
    password: user.password,
  });

  return {
    res,
    accessToken: res.body.accessToken,
    refreshToken: res.body.refreshToken,
  };
}

test('register + login + bootstrap protected flow works', async () => {
  const { user, res: registerRes } = await registerUser();
  assert.equal(registerRes.status, 201);

  const login = await loginUser(user);
  assert.equal(login.res.status, 200);
  assert.ok(login.accessToken);
  assert.ok(login.refreshToken);

  const unauthorized = await client.get('/api/bootstrap');
  assert.equal(unauthorized.status, 401);

  const bootstrap = await client
    .get('/api/bootstrap')
    .set('Authorization', `Bearer ${login.accessToken}`);

  assert.equal(bootstrap.status, 200);
  assert.ok(Array.isArray(bootstrap.body.resources));
  assert.ok(Array.isArray(bootstrap.body.disasters));
});

test('refresh and logout token lifecycle works', async () => {
  const { user } = await registerUser();
  const login = await loginUser(user);

  const refreshed = await client
    .post('/api/auth/refresh')
    .send({ refreshToken: login.refreshToken });

  assert.equal(refreshed.status, 200);
  assert.ok(refreshed.body.accessToken);

  const logoutRes = await client
    .post('/api/auth/logout')
    .set('Authorization', `Bearer ${login.accessToken}`)
    .send({ refreshToken: login.refreshToken });

  assert.equal(logoutRes.status, 200);

  const refreshAfterLogout = await client
    .post('/api/auth/refresh')
    .send({ refreshToken: login.refreshToken });

  assert.equal(refreshAfterLogout.status, 401);
});

test('mutating resource endpoint creates audit logs', async () => {
  const { user } = await registerUser();
  const login = await loginUser(user);

  const created = await client
    .post('/api/resources')
    .set('Authorization', `Bearer ${login.accessToken}`)
    .send({
      name: 'Field Kit',
      category: 'Medical',
      qty: 25,
      location: 'Zone C Depot',
      notes: 'for triage teams',
    });

  assert.equal(created.status, 201);

  const logs = await client
    .get('/api/audit-logs')
    .set('Authorization', `Bearer ${login.accessToken}`);

  assert.equal(logs.status, 200);
  assert.ok(Array.isArray(logs.body));
  assert.ok(logs.body.some((row) => row.action === 'RESOURCE_CREATE'));
});
