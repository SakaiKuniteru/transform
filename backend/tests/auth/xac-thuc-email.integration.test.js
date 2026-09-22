'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { taoAgent, khoiDongRuntimeTest, dongRuntimeTest } = require('../helpers/runtime-test.helper');
const { MUC_DICH_OTP, dangKyQuaApi, layNguoiDungTheoEmail, layOtpMoiNhat, datMaOtpTest, xacThucEmailQuaApi } = require('../helpers/auth-test.helper');

let agent;

test.before(async () => { await khoiDongRuntimeTest(); agent = taoAgent(); });
test.after(async () => { await dongRuntimeTest(); });

test('xác thực email bằng OTP hợp lệ', async () => {
    const { duLieu, response } = await dangKyQuaApi(agent, { prefix: 'verify' });
    assert.equal(response.statusCode, 201);
    const maOtp = await datMaOtpTest(duLieu.email, MUC_DICH_OTP.XAC_THUC_EMAIL);
    const verify = await xacThucEmailQuaApi(agent, duLieu.email, maOtp);
    assert.equal(verify.statusCode, 200);
    assert.equal(verify.body.success, true);
    assert.ok(verify.body.data?.emailXacThucLuc);
    const nguoiDung = await layNguoiDungTheoEmail(duLieu.email);
    const otp = await layOtpMoiNhat(duLieu.email, MUC_DICH_OTP.XAC_THUC_EMAIL);
    assert.ok(nguoiDung.emailXacThucLuc);
    assert.equal(otp.trangThai, 'DA_XAC_THUC');
    assert.ok(otp.xacThucLuc);
});

test('OTP email sai tăng số lần thử', async () => {
    const { duLieu, response } = await dangKyQuaApi(agent, { prefix: 'verify-sai' });
    assert.equal(response.statusCode, 201);
    await datMaOtpTest(duLieu.email, MUC_DICH_OTP.XAC_THUC_EMAIL, '123456');
    const verify = await xacThucEmailQuaApi(agent, duLieu.email, '654321');
    assert.equal(verify.statusCode, 400);
    assert.equal(verify.body.error?.code, 'OTP_KHONG_HOP_LE');
    const otp = await layOtpMoiNhat(duLieu.email, MUC_DICH_OTP.XAC_THUC_EMAIL);
    assert.equal(otp.soLanThu, 1);
    assert.equal(otp.trangThai, 'CHO_XAC_THUC');
});