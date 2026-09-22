'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { taoAgent, khoiDongRuntimeTest, dongRuntimeTest } = require('../helpers/runtime-test.helper');
const { MUC_DICH_OTP, taoDanhTinh, dangKyQuaApi, layOtpMoiNhat, choPhepGuiLaiOtp } = require('../helpers/auth-test.helper');

let agent;

test.before(async () => { await khoiDongRuntimeTest(); agent = taoAgent(); });
test.after(async () => { await dongRuntimeTest(); });

test('gửi lại OTP cập nhật mã và tăng số lần gửi', async () => {
    const { duLieu, response } = await dangKyQuaApi(agent, { prefix: 'resend' });
    assert.equal(response.statusCode, 201);
    const truoc = await layOtpMoiNhat(duLieu.email, MUC_DICH_OTP.XAC_THUC_EMAIL);
    assert.ok(truoc);
    await choPhepGuiLaiOtp(duLieu.email, MUC_DICH_OTP.XAC_THUC_EMAIL);
    const resend = await agent.post('/api/v1/xac-thuc/gui-lai-otp').send({ email: duLieu.email });
    assert.equal(resend.statusCode, 200);
    assert.equal(resend.body.success, true);
    assert.equal(resend.body.data?.daGui, true);
    const sau = await layOtpMoiNhat(duLieu.email, MUC_DICH_OTP.XAC_THUC_EMAIL);
    assert.equal(sau.id, truoc.id);
    assert.equal(sau.soLanGui, truoc.soLanGui + 1);
    assert.notEqual(sau.maHash, truoc.maHash);
});

test('gửi lại OTP quá sớm bị từ chối', async () => {
    const { duLieu, response } = await dangKyQuaApi(agent, { prefix: 'resend-fast' });
    assert.equal(response.statusCode, 201);
    const resend = await agent.post('/api/v1/xac-thuc/gui-lai-otp').send({ email: duLieu.email });
    assert.equal(resend.statusCode, 429);
    assert.equal(resend.body.error?.code, 'OTP_GUI_QUA_NHANH');
});

test('gửi lại OTP với email không tồn tại vẫn trả response chung', async () => {
    const danhTinh = taoDanhTinh('resend-none');
    const response = await agent.post('/api/v1/xac-thuc/gui-lai-otp').send({ email: danhTinh.email });
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data?.daGui, true);
});