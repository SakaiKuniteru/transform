'use strict';
const { taoForm } = require('../../../core/forms/form-builder');
const guiLaiOtpForm = taoForm('gui-lai-otp', { method: 'POST', action: '/gui-lai-otp' })
    .field('email', 'hidden', { required: true, maxLength: 320 })
    .submit('Gửi lại mã', { className: 'btn btn-link' })
    .build();

module.exports = {
    guiLaiOtpForm
};