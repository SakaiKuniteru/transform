'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { taoAgent, khoiDongRuntimeTest, dongRuntimeTest, taoNguoiDungTest } = require('../helpers/runtime-test.helper');
const { MUC_DICH_OTP, datMaOtpTest } = require('../helpers/auth-test.helper');

let agent;

test.before(async () => { await khoiDongRuntimeTest(); agent = taoAgent(); });
test.after(async () => { await dongRuntimeTest(); });

test('OTP đặt lại mật khẩu tạo reset token và đổi được mật khẩu', async () => {
    const nguoiDung = await taoNguoiDungTest({ matKhau: 'Old@123456' });
    const forgot = await agent.post('/api/v1/xac-thuc/quen-mat-khau').send({ email: nguoiDung.email });
    assert.equal(forgot.statusCode, 200);
    const maOtp = await datMaOtpTest(nguoiDung.email, MUC_DICH_OTP.DAT_LAI_MAT_KHAU, '123456');
    const verify = await agent.post('/api/v1/xac-thuc/xac-thuc-otp-dat-lai-mat-khau').send({ email: nguoiDung.email, maOtp });
    assert.equal(verify.statusCode, 200);
    assert.equal(verify.body.success, true);
    const resetToken = verify.body.data?.resetToken;
    assert.ok(resetToken);
    const reset = await agent.post('/api/v1/xac-thuc/dat-lai-mat-khau').send({ resetToken, matKhauMoi: 'New@123456' });
    assert.equal(reset.statusCode, 200);
    assert.equal(reset.body.success, true);
    const loginCu = await agent.post('/api/v1/xac-thuc/dang-nhap').send({ tenDangNhap: nguoiDung.email, matKhau: 'Old@123456' });
    assert.equal(loginCu.statusCode, 401);
    const loginMoi = await agent.post('/api/v1/xac-thuc/dang-nhap').send({ tenDangNhap: nguoiDung.email, matKhau: 'New@123456' });
    assert.equal(loginMoi.statusCode, 200);
    assert.ok(loginMoi.body.data?.accessToken);
});

test('reset token chỉ được sử dụng một lần', async () => {
    const nguoiDung = await taoNguoiDungTest({ matKhau: 'First@123456' });
    const forgot = await agent.post('/api/v1/xac-thuc/quen-mat-khau').send({ email: nguoiDung.email });
    assert.equal(forgot.statusCode, 200);
    const maOtp = await datMaOtpTest(nguoiDung.email, MUC_DICH_OTP.DAT_LAI_MAT_KHAU, '234567');
    const verify = await agent.post('/api/v1/xac-thuc/xac-thuc-otp-dat-lai-mat-khau').send({ email: nguoiDung.email, maOtp });
    assert.equal(verify.statusCode, 200);
    const resetToken = verify.body.data?.resetToken;
    const lanMot = await agent.post('/api/v1/xac-thuc/dat-lai-mat-khau').send({ resetToken, matKhauMoi: 'Second@123456' });
    assert.equal(lanMot.statusCode, 200);
    const lanHai = await agent.post('/api/v1/xac-thuc/dat-lai-mat-khau').send({ resetToken, matKhauMoi: 'Third@123456' });
    assert.equal(lanHai.statusCode, 401);
    assert.equal(lanHai.body.error?.code, 'TOKEN_KHONG_HOP_LE');
});