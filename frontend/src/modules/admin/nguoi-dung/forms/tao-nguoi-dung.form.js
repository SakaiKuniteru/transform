'use strict';

const { taoForm } = require('../../../../core/forms/form-builder');
const { LOAI_TAI_KHOAN_OPTIONS, TRANG_THAI_OPTIONS } = require('../nguoi-dung.service');

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

const taoNguoiDungForm = taoForm('admin-tao-nguoi-dung', {
    method: 'POST',
    action: '/admin/nguoi-dung/tao'
})
    .field('email', 'email', {
        label: 'Email',
        required: true,
        maxLength: 320,
        autocomplete: 'off',
        placeholder: 'Nhập email'
    })
    .field('tenDangNhap', 'text', {
        label: 'Tên đăng nhập',
        minLength: 3,
        maxLength: 100,
        pattern: '^[a-z0-9._-]+$',
        autocomplete: 'off',
        placeholder: 'Có thể để trống'
    })
    .field('hoTen', 'text', {
        label: 'Họ và tên',
        required: true,
        minLength: 2,
        maxLength: 255,
        autocomplete: 'off',
        placeholder: 'Nhập họ và tên'
    })
    .field('matKhau', 'password', {
        label: 'Mật khẩu',
        required: true,
        minLength: 8,
        maxLength: 128,
        autocomplete: 'new-password',
        placeholder: 'Tạo mật khẩu',
        validators: QUY_TAC_MAT_KHAU
    })
    .field('xacNhanMatKhau', 'password', {
        label: 'Xác nhận mật khẩu',
        required: true,
        minLength: 8,
        maxLength: 128,
        autocomplete: 'new-password',
        placeholder: 'Nhập lại mật khẩu',
        sameAs: 'matKhau',
        messages: {
            sameAs: 'Mật khẩu xác nhận không khớp.'
        }
    })
    .field('loaiTaiKhoan', 'select', {
        label: 'Loại tài khoản',
        required: true,
        defaultValue: 'NGUOI_DUNG',
        options: LOAI_TAI_KHOAN_OPTIONS
    })
    .field('trangThai', 'select', {
        label: 'Trạng thái',
        required: true,
        defaultValue: 'HOAT_DONG',
        options: TRANG_THAI_OPTIONS
    })
    .field('emailDaXacThuc', 'toggle', {
        text: 'Đánh dấu email đã xác thực',
        defaultValue: false
    })
    .submit('Tạo người dùng', {
        className: 'btn btn-primary'
    })
    .build();

module.exports = {
    taoNguoiDungForm
};