'use strict';
const { taoForm } = require('../../../core/forms/form-builder');
const QUY_TAC_MAT_KHAU = Object.freeze([
    Object.freeze({ type: 'pattern', value: /[a-z]/, message: 'Mật khẩu phải có ít nhất một chữ thường.' }),
    Object.freeze({ type: 'pattern', value: /[A-Z]/, message: 'Mật khẩu phải có ít nhất một chữ hoa.' }),
    Object.freeze({ type: 'pattern', value: /[0-9]/, message: 'Mật khẩu phải có ít nhất một chữ số.' }),
    Object.freeze({ type: 'pattern', value: /[^A-Za-z0-9]/, message: 'Mật khẩu phải có ít nhất một ký tự đặc biệt.' })
]);
const dangKyForm = taoForm('dang-ky', { method: 'POST', action: '/dang-ky' })
    .field('email', 'email', { label: 'Email', required: true, maxLength: 320, autocomplete: 'email', placeholder: 'Nhập email' })
    .field('tenDangNhap', 'text', { label: 'Tên đăng nhập', minLength: 3, maxLength: 100, pattern: '^[a-z0-9._-]+$', autocomplete: 'username', placeholder: 'Có thể để trống' })
    .field('hoTen', 'text', { label: 'Họ và tên', required: true, minLength: 2, maxLength: 255, autocomplete: 'name', placeholder: 'Nhập họ và tên' })
    .field('matKhau', 'password', { label: 'Mật khẩu', required: true, minLength: 8, maxLength: 128, autocomplete: 'new-password', placeholder: 'Tạo mật khẩu', validators: QUY_TAC_MAT_KHAU })
    .field('xacNhanMatKhau', 'password', { label: 'Xác nhận mật khẩu', required: true, minLength: 8, maxLength: 128, autocomplete: 'new-password', placeholder: 'Nhập lại mật khẩu', sameAs: 'matKhau', messages: { sameAs: 'Mật khẩu xác nhận không khớp.' } })
    .submit('Đăng ký', { className: 'btn btn-primary' })
    .build();

module.exports = {
    dangKyForm
};