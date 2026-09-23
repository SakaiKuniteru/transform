'use strict';

const { taoForm } = require('../../../../core/forms/form-builder');

const QUY_TAC_MAT_KHAU = Object.freeze([
    Object.freeze({
        type: 'pattern',
        value: /[a-z]/,
        message: 'Mật khẩu phải có ít nhất một chữ thường.'
    }),
    Object.freeze({
        type: 'pattern',
        value: /[A-Z]/,
        message: 'Mật khẩu phải có ít nhất một chữ hoa.'
    }),
    Object.freeze({
        type: 'pattern',
        value: /[0-9]/,
        message: 'Mật khẩu phải có ít nhất một chữ số.'
    }),
    Object.freeze({
        type: 'pattern',
        value: /[^A-Za-z0-9]/,
        message: 'Mật khẩu phải có ít nhất một ký tự đặc biệt.'
    })
]);

const doiMatKhauForm = taoForm('tai-khoan-doi-mat-khau', {
    method: 'POST',
    action: '/user/tai-khoan/doi-mat-khau'
})
    .field('matKhauHienTai', 'password', {
        label: 'Mật khẩu hiện tại',
        required: true,
        minLength: 1,
        maxLength: 128,
        autocomplete: 'current-password',
        placeholder: 'Nhập mật khẩu hiện tại'
    })
    .field('matKhauMoi', 'password', {
        label: 'Mật khẩu mới',
        required: true,
        minLength: 8,
        maxLength: 128,
        autocomplete: 'new-password',
        placeholder: 'Nhập mật khẩu mới',
        validators: QUY_TAC_MAT_KHAU
    })
    .field('xacNhanMatKhauMoi', 'password', {
        label: 'Xác nhận mật khẩu mới',
        required: true,
        minLength: 8,
        maxLength: 128,
        autocomplete: 'new-password',
        placeholder: 'Nhập lại mật khẩu mới',
        sameAs: 'matKhauMoi',
        messages: {
            sameAs: 'Mật khẩu xác nhận không khớp.'
        }
    })
    .submit('Đổi mật khẩu', {
        className: 'btn btn-primary'
    })
    .build();

module.exports = {
    doiMatKhauForm
};