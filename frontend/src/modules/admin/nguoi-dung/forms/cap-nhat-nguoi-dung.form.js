'use strict';

const { taoForm } = require('../../../../core/forms/form-builder');
const { LOAI_TAI_KHOAN_OPTIONS } = require('../nguoi-dung.service');

function taoCapNhatNguoiDungForm(context = {}) {
    const builder = taoForm('admin-cap-nhat-nguoi-dung', {
        method: 'POST',
        action: `/admin/nguoi-dung/${context.id}/cap-nhat`
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
        });
    if (context.khoaLoaiTaiKhoan) { builder.field('loaiTaiKhoan', 'hidden', { defaultValue: context.loaiTaiKhoan }); }
    else {
        builder.field('loaiTaiKhoan', 'select', {
            label: 'Loại tài khoản',
            required: true,
            defaultValue: context.loaiTaiKhoan || 'NGUOI_DUNG',
            options: LOAI_TAI_KHOAN_OPTIONS
        });
    }
    return builder.submit('Lưu thay đổi', {
        className: 'btn btn-primary'
    }).build();
}

module.exports = {
    taoCapNhatNguoiDungForm
};