'use strict';
const { taoForm } = require('../../../core/forms/form-builder');
const quenMatKhauForm = taoForm('quen-mat-khau', { method: 'POST', action: '/quen-mat-khau' })
    .field('email', 'email', { label: 'Email', required: true, maxLength: 320, autocomplete: 'email', placeholder: 'Nhập email tài khoản' })
    .submit('Gửi mã xác thực', { className: 'btn btn-primary' })
    .build();

module.exports = {
    quenMatKhauForm
};