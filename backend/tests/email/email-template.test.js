'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { taoXacThucEmailTemplate } = require('../../src/infrastructure/email/templates/xac-thuc-email.template');
const { taoDatLaiMatKhauTemplate } = require('../../src/infrastructure/email/templates/dat-lai-mat-khau.template');

test('template xác thực email chứa OTP và thời gian hết hạn', () => {
    const ketQua = taoXacThucEmailTemplate({ hoTen: 'Quốc Huy', maOtp: '123456', ttlSeconds: 600 });
    assert.equal(ketQua.subject, 'Mã xác thực email Transform');
    assert.match(ketQua.text, /123456/);
    assert.match(ketQua.text, /10 phút/);
    assert.match(ketQua.html, /123456/);
});

test('template xác thực email escape HTML từ tên người dùng', () => {
    const ketQua = taoXacThucEmailTemplate({ hoTen: '<script>alert(1)</script>', maOtp: '123456', ttlSeconds: 600 });
    assert.doesNotMatch(ketQua.html, /<script>alert\(1\)<\/script>/);
    assert.match(ketQua.html, /&lt;script&gt;/);
});

test('template đặt lại mật khẩu chứa OTP', () => {
    const ketQua = taoDatLaiMatKhauTemplate({ hoTen: 'Quốc Huy', maOtp: '654321', ttlSeconds: 300 });
    assert.equal(ketQua.subject, 'Mã đặt lại mật khẩu Transform');
    assert.match(ketQua.text, /654321/);
    assert.match(ketQua.text, /5 phút/);
    assert.match(ketQua.html, /654321/);
});

test('template từ chối OTP không phải dạng số', () => {
    assert.throws(() => taoXacThucEmailTemplate({ maOtp: 'ABC123' }), /OTP/);
    assert.throws(() => taoDatLaiMatKhauTemplate({ maOtp: '' }), /OTP/);
});