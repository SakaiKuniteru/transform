'use strict';
const { taoForm } = require('../../../core/forms/form-builder');
const xacThucEmailForm = taoForm('xac-thuc-email', { method: 'POST', action: '/xac-thuc-email' })
    .field('email', 'email', { label: 'Email', required: true, maxLength: 320, autocomplete: 'email', placeholder: 'Nhập email cần xác thực' })
    .field('maOtp', 'otp', { label: 'Mã xác thực', required: true, minLength: 6, maxLength: 6, pattern: '^\\d{6}$', autocomplete: 'one-time-code', placeholder: 'Nhập mã 6 số' })
    .submit('Xác thực email', { className: 'btn btn-primary' })
    .build();

module.exports = {
    xacThucEmailForm
};