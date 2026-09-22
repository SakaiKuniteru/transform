'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
    taoRequest,
    khoiDongRuntimeTest,
    dongRuntimeTest
} = require('../helpers/runtime-test.helper');

test.before(async () => { await khoiDongRuntimeTest(); });
test.after(async () => { await dongRuntimeTest(); });

test('GET /api/v1/health trả 200', async () => {
    const response = await taoRequest().get('/api/v1/health');
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
});

test('GET /api/v1/health/ready xác nhận database, redis và storage sẵn sàng', async () => {
    const response = await taoRequest().get('/api/v1/health/ready');
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data?.status, 'READY');
    assert.equal(response.body.data?.database?.connected, true);
    assert.equal(response.body.data?.redis?.connected, true);
    assert.equal(response.body.data?.storage?.ready, true);
});

test('CORS cho phép request nội bộ không có Origin', async () => {
    const response = await taoRequest().get('/api/v1/health');
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers['access-control-allow-origin'], undefined);
});

test('CORS cho phép Origin nằm trong allowlist', async () => {
    const response = await taoRequest().get('/api/v1/health').set('Origin', 'http://localhost:2320');
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers['access-control-allow-origin'], 'http://localhost:2320');
});

test('CORS từ chối Origin ngoài allowlist bằng 403', async () => {
    const response = await taoRequest().get('/api/v1/health').set('Origin', 'https://evil.example');
    assert.equal(response.statusCode, 403);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error?.code, 'CORS_KHONG_DUOC_PHEP');
});