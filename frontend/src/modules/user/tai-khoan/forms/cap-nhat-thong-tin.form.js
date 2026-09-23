'use strict';

const { taoForm } = require('../../../../core/forms/form-builder');

const capNhatThongTinForm = taoForm('cap-nhat-thong-tin', {
    method: 'POST',
    action: '/user/tai-khoan/cap-nhat'
})
    .field('tenDangNhap', 'text', {
        label: 'Tên đăng nhập',
        minLength: 3,
        maxLength: 100,
        pattern: '^[a-z0-9._-]+$',
        autocomplete: 'username',
        placeholder: 'Nhập tên đăng nhập'
    })
    .field('hoTen', 'text', {
        label: 'Họ và tên',
        required: true,
        minLength: 2,
        maxLength: 255,
        autocomplete: 'name',
        placeholder: 'Nhập họ và tên'
    })
    .submit('Lưu thay đổi', {
        className: 'btn btn-primary'
    })
    .build();

module.exports = {
    capNhatThongTinForm
};