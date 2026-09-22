'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { taoAgent, khoiDongRuntimeTest, dongRuntimeTest } = require('../helpers/runtime-test.helper');
const { MUC_DICH_OTP, dangKyQuaApi, layNguoiDungTheoEmail, layOtpMoiNhat } = require('../helpers/auth-test.helper');

let agent;

test.before(async () => { await khoiDongRuntimeTest(); agent = taoAgent(); });
test.after(async () => { await dongRuntimeTest(); });

test('đăng ký tạo tài khoản chưa xác thực và OTP hash', async () => {
    const { duLieu, response } = await dangKyQuaApi(agent, { prefix: 'dangky' });
    assert.equal(response.statusCode, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data?.nguoiDung?.email, duLieu.email);
    assert.equal(response.body.data?.nguoiDung?.emailXacThucLuc, null);
    assert.equal(Object.hasOwn(response.body.data || {}, 'maOtpDevelopment'), false);
    const nguoiDung = await layNguoiDungTheoEmail(duLieu.email);
    assert.ok(nguoiDung);
    assert.equal(nguoiDung.emailXacThucLuc, null);
    const otp = await layOtpMoiNhat(duLieu.email, MUC_DICH_OTP.XAC_THUC_EMAIL);
    assert.ok(otp);
    assert.equal(otp.trangThai, 'CHO_XAC_THUC');
    assert.match(otp.maHash, /^[a-f0-9]{64}$/);
});

test('đăng ký từ chối email đã tồn tại', async () => {
    const { duLieu, response } = await dangKyQuaApi(agent, { prefix: 'duplicate' });
    assert.equal(response.statusCode, 201);
    const duplicate = await agent.post('/api/v1/xac-thuc/dang-ky').send({ ...duLieu, tenDangNhap: `${duLieu.tenDangNhap}_2` });
    assert.equal(duplicate.statusCode, 409);
    assert.equal(duplicate.body.success, false);
    assert.equal(duplicate.body.error?.code, 'EMAIL_DA_TON_TAI');
});