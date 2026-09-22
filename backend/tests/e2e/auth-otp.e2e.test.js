'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { taoAgent, khoiDongRuntimeTest, dongRuntimeTest } = require('../helpers/runtime-test.helper');
const { MUC_DICH_OTP, dangKyQuaApi, datMaOtpTest } = require('../helpers/auth-test.helper');

let agent;

test.before(async () => { await khoiDongRuntimeTest(); agent = taoAgent(); });
test.after(async () => { await dongRuntimeTest(); });

test('full flow đăng ký → OTP → login → quên mật khẩu → OTP → reset → login mới', async () => {
    const { duLieu, response: dangKy } = await dangKyQuaApi(agent, { prefix: 'auth-e2e' });
    assert.equal(dangKy.statusCode, 201);
    assert.equal(dangKy.body.success, true);
    const loginChuaXacThuc = await agent.post('/api/v1/xac-thuc/dang-nhap').send({ tenDangNhap: duLieu.email, matKhau: duLieu.matKhau });
    assert.equal(loginChuaXacThuc.statusCode, 403);
    assert.equal(loginChuaXacThuc.body.error?.code, 'EMAIL_CHUA_XAC_THUC');
    const otpXacThucEmail = await datMaOtpTest(duLieu.email, MUC_DICH_OTP.XAC_THUC_EMAIL, '123456');
    const xacThucEmail = await agent.post('/api/v1/xac-thuc/xac-thuc-email').send({ email: duLieu.email, maOtp: otpXacThucEmail });
    assert.equal(xacThucEmail.statusCode, 200);
    assert.ok(xacThucEmail.body.data?.emailXacThucLuc);
    const login = await agent.post('/api/v1/xac-thuc/dang-nhap').send({ tenDangNhap: duLieu.email, matKhau: duLieu.matKhau });
    assert.equal(login.statusCode, 200);
    assert.ok(login.body.data?.accessToken);
    assert.ok(login.headers['set-cookie']?.length);
    const forgot = await agent.post('/api/v1/xac-thuc/quen-mat-khau').send({ email: duLieu.email });
    assert.equal(forgot.statusCode, 200);
    assert.equal(forgot.body.data?.daGui, true);
    const otpReset = await datMaOtpTest(duLieu.email, MUC_DICH_OTP.DAT_LAI_MAT_KHAU, '654321');
    const verifyReset = await agent.post('/api/v1/xac-thuc/xac-thuc-otp-dat-lai-mat-khau').send({ email: duLieu.email, maOtp: otpReset });
    assert.equal(verifyReset.statusCode, 200);
    const resetToken = verifyReset.body.data?.resetToken;
    assert.ok(resetToken);
    const matKhauMoi = 'Changed@123456';
    const reset = await agent.post('/api/v1/xac-thuc/dat-lai-mat-khau').send({ resetToken, matKhauMoi });
    assert.equal(reset.statusCode, 200);
    const loginMatKhauCu = await agent.post('/api/v1/xac-thuc/dang-nhap').send({ tenDangNhap: duLieu.email, matKhau: duLieu.matKhau });
    assert.equal(loginMatKhauCu.statusCode, 401);
    const loginMatKhauMoi = await agent.post('/api/v1/xac-thuc/dang-nhap').send({ tenDangNhap: duLieu.email, matKhau: matKhauMoi });
    assert.equal(loginMatKhauMoi.statusCode, 200);
    assert.ok(loginMatKhauMoi.body.data?.accessToken);
});