'use strict';
const { taoForm } = require('../../../core/forms/form-builder');
const dangNhapForm = taoForm('dang-nhap', { method: 'POST', action: '/dang-nhap' })
    .field('tenDangNhap', 'text', { label: 'Email hoặc tên đăng nhập', required: true, minLength: 3, maxLength: 320, autocomplete: 'username', placeholder: 'Nhập email hoặc tên đăng nhập' })
    .field('matKhau', 'password', { label: 'Mật khẩu', required: true, minLength: 1, maxLength: 128, autocomplete: 'current-password', placeholder: 'Nhập mật khẩu' })
    .submit('Đăng nhập', { className: 'btn btn-primary' })
    .build();

module.exports = {
    dangNhapForm
};