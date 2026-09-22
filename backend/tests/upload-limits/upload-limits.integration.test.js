'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
    taoAgent,
    khoiDongRuntimeTest,
    dongRuntimeTest,
    taoAnhBuffer,
    uploadBuffer,
    datGioiHanChinhSach,
    taoNguoiDungTest,
    dangNhap
} = require('../helpers/runtime-test.helper');

test.before(async () => { await khoiDongRuntimeTest(); });
test.after(async () => { await dongRuntimeTest(); });

test('guest chỉ được upload 2 lần mỗi ngày', async () => {
    const agent = taoAgent();
    const buffer = await taoAnhBuffer('png', 32, 32);
    const lan1 = await uploadBuffer(agent, buffer, 'guest-1.png', 'image/png');
    const lan2 = await uploadBuffer(agent, buffer, 'guest-2.png', 'image/png');
    const lan3 = await uploadBuffer(agent, buffer, 'guest-3.png', 'image/png');
    assert.equal(lan1.statusCode, 201);
    assert.equal(lan2.statusCode, 201);
    assert.equal(lan3.statusCode, 401);
    assert.equal(lan3.body.error?.code, 'YEU_CAU_DANG_NHAP');
});

test('người dùng thường chỉ được upload 5 lần mỗi ngày khi chưa có gói', async () => {
    const agent = taoAgent();
    const nguoiDung = await taoNguoiDungTest();
    const accessToken = await dangNhap(agent, nguoiDung.tenDangNhap, nguoiDung.matKhau);
    const buffer = await taoAnhBuffer('png', 32, 32);
    for (let i = 1; i <= 5; i += 1) {
        const response = await uploadBuffer(agent, buffer, `user-${i}.png`, 'image/png', accessToken);
        assert.equal(response.statusCode, 201);
    }
    const response = await uploadBuffer(agent, buffer, 'user-6.png', 'image/png', accessToken);
    assert.equal(response.statusCode, 403);
    assert.equal(response.body.error?.code, 'YEU_CAU_NANG_CAP');
});

test('chính sách số file/request chặn request vượt giới hạn', async () => {
    await datGioiHanChinhSach('UPLOAD_KHACH_SO_TEP_MOI_LAN', 2);
    const agent = taoAgent();
    const buffer = await taoAnhBuffer('png', 16, 16);
    const response = await agent.post('/api/v1/tep/upload')
        .attach('teps', buffer, { filename: '1.png', contentType: 'image/png' })
        .attach('teps', buffer, { filename: '2.png', contentType: 'image/png' })
        .attach('teps', buffer, { filename: '3.png', contentType: 'image/png' });
    assert.equal(response.statusCode, 413);
    assert.equal(response.body.error?.code, 'UPLOAD_VUOT_SO_TEP');
});

test('chính sách kích thước/file chặn tệp quá lớn', async () => {
    await datGioiHanChinhSach('UPLOAD_KHACH_KICH_THUOC_MOI_TEP', 1024);
    const agent = taoAgent();
    const buffer = Buffer.alloc(2048, 1);
    const response = await uploadBuffer(agent, buffer, 'qua-lon.bin', 'application/octet-stream');
    assert.equal(response.statusCode, 413);
    assert.equal(response.body.error?.code, 'TEP_VUOT_KICH_THUOC');
});