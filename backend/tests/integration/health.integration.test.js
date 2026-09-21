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