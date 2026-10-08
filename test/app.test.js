const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const server = require('../app');

let baseUrl;

beforeEach(async () => {
  await new Promise((resolve, reject) => {
    const onError = (err) => reject(err);
    server.once('error', onError);
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', onError);
      resolve();
    });
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  if (!server.listening) {
    return;
  }
  await new Promise((resolve) => {
    server.close(resolve);
    if (typeof server.closeIdleConnections === 'function') {
      server.closeIdleConnections();
    }
  });
});

test('GET /health returns 200 with status ok', async (t) => {
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'ok');
  assert.equal(typeof body.uptime, 'number');
  assert.equal(typeof body.timestamp, 'string');
});

test('GET /api/products returns 200 with 6 products', async (t) => {
  const res = await fetch(`${baseUrl}/api/products`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body));
  assert.equal(body.length, 6);
});

test('GET /api/products/1 returns 200 with product id 1', async (t) => {
  const res = await fetch(`${baseUrl}/api/products/1`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.id, 1);
  assert.equal(typeof body.name, 'string');
  assert.equal(typeof body.price, 'number');
});

test('GET /api/products/999 returns 404 with status error', async (t) => {
  const res = await fetch(`${baseUrl}/api/products/999`);
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.status, 'error');
});

test('GET /definitely-not-a-route returns 404', async (t) => {
  const res = await fetch(`${baseUrl}/definitely-not-a-route`);
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.status, 'error');
  assert.match(body.message, /Route not found: GET \/definitely-not-a-route/);
});
