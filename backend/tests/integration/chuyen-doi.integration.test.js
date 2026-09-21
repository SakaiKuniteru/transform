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

test('API chuyển đổi báo hỗ trợ PNG sang WebP bằng Sharp', async () => {
    const response = await taoRequest().get('/api/v1/chuyen-doi/ho-tro').query({
        loaiChuyenDoi: 'CHUYEN_DINH_DANG',
        dinhDangNguon: 'png',
        dinhDangDich: 'webp'
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.ok(response.body.data.some((item) => item.key === 'sharp:chuyen-dinh-dang-hinh-anh'));
});