'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { taoAgent, khoiDongRuntimeTest, dongRuntimeTest, taoNguoiDungTest } = require('../helpers/runtime-test.helper');
const { MUC_DICH_OTP, taoDanhTinh, layOtpMoiNhat } = require('../helpers/auth-test.helper');

let agent;

test.before(async () => { await khoiDongRuntimeTest(); agent = taoAgent(); });
test.after(async () => { await dongRuntimeTest(); });

test('quên mật khẩu tạo OTP đặt lại mật khẩu cho tài khoản hợp lệ', async () => {
    const nguoiDung = await taoNguoiDungTest();
    const response = await agent.post('/api/v1/xac-thuc/quen-mat-khau').send({ email: nguoiDung.email });
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data?.daGui, true);
    const otp = await layOtpMoiNhat(nguoiDung.email, MUC_DICH_OTP.DAT_LAI_MAT_KHAU);
    assert.ok(otp);
    assert.equal(otp.mucDich, MUC_DICH_OTP.DAT_LAI_MAT_KHAU);
    assert.equal(otp.trangThai, 'CHO_XAC_THUC');
});

test('quên mật khẩu không làm lộ email không tồn tại', async () => {
    const danhTinh = taoDanhTinh('forgot-none');
    const response = await agent.post('/api/v1/xac-thuc/quen-mat-khau').send({ email: danhTinh.email });
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data?.daGui, true);
    const otp = await layOtpMoiNhat(danhTinh.email, MUC_DICH_OTP.DAT_LAI_MAT_KHAU);
    assert.equal(otp, null);
});