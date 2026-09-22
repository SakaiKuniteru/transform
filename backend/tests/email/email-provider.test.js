'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { taoProvider, chuanHoaMaProvider } = require('../../src/infrastructure/email/email-provider');
const emailService = require('../../src/infrastructure/email/email.service');

test('email provider yêu cầu mã và hàm gui', () => {
    assert.equal(chuanHoaMaProvider(' SMTP '), 'smtp');
    assert.throws(() => taoProvider({ ma: 'smtp' }), /gui/);
});

test('taoProvider tạo provider bất biến đúng contract', () => {
    const provider = taoProvider({ ma: 'test', ten: 'Test Provider', gui: async () => ({ ok: true }) });
    assert.equal(provider.ma, 'test');
    assert.equal(provider.ten, 'Test Provider');
    assert.equal(typeof provider.gui, 'function');
    assert.equal(Object.isFrozen(provider), true);
});

test('email service chuẩn hóa địa chỉ email', () => {
    assert.equal(emailService.chuanHoaDiaChiEmail(' USER@EXAMPLE.COM '), 'user@example.com');
    assert.deepEqual(emailService.chuanHoaDiaChiEmail({ name: 'User', address: ' USER@EXAMPLE.COM ' }), { name: 'User', address: 'user@example.com' });
    assert.throws(() => emailService.chuanHoaDiaChiEmail('khong-hop-le'), /không hợp lệ/);
});

test('SMTP provider đã được đăng ký trong email service', () => {
    const provider = emailService.layProvider('smtp');
    assert.ok(provider);
    assert.equal(provider.ma, 'smtp');
    assert.equal(typeof provider.gui, 'function');
    assert.equal(typeof provider.kiemTra, 'function');
});