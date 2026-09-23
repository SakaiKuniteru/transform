'use strict';
const { taoForm } = require('../../../core/forms/form-builder');
const QUY_TAC_MAT_KHAU = Object.freeze([
    Object.freeze({ type: 'pattern', value: /[a-z]/, message: 'Mật khẩu phải có ít nhất một chữ thường.' }),
    Object.freeze({ type: 'pattern', value: /[A-Z]/, message: 'Mật khẩu phải có ít nhất một chữ hoa.' }),
    Object.freeze({ type: 'pattern', value: /[0-9]/, message: 'Mật khẩu phải có ít nhất một chữ số.' }),
    Object.freeze({ type: 'pattern', value: /[^A-Za-z0-9]/, message: 'Mật khẩu phải có ít nhất một ký tự đặc biệt.' })
]);

function taoDatLaiMatKhauForm(options = {}) {
    const buoc = options.buoc || 'otp';
    if (buoc === 'otp') { return taoForm('dat-lai-mat-khau-otp', { method: 'POST', action: '/dat-lai-mat-khau' }).field('maOtp', 'otp', { label: 'Mã xác thực', required: true, minLength: 6, maxLength: 6, pattern: '^\\d{6}$', autocomplete: 'one-time-code', placeholder: 'Nhập mã 6 số' }).submit('Xác thực mã', { className: 'btn btn-primary' }).build(); }
    if (buoc === 'mat-khau') { return taoForm('dat-lai-mat-khau-moi', { method: 'POST', action: '/dat-lai-mat-khau' }).field('matKhauMoi', 'password', { label: 'Mật khẩu mới', required: true, minLength: 8, maxLength: 128, autocomplete: 'new-password', placeholder: 'Nhập mật khẩu mới', validators: QUY_TAC_MAT_KHAU }).field('xacNhanMatKhauMoi', 'password', { label: 'Xác nhận mật khẩu mới', required: true, minLength: 8, maxLength: 128, autocomplete: 'new-password', placeholder: 'Nhập lại mật khẩu mới', sameAs: 'matKhauMoi', messages: { sameAs: 'Mật khẩu xác nhận không khớp.' } }).submit('Đặt lại mật khẩu', { className: 'btn btn-primary' }).build(); }
    throw new TypeError(`Bước đặt lại mật khẩu không hợp lệ: ${buoc}.`);
}

module.exports = {
    taoDatLaiMatKhauForm
};