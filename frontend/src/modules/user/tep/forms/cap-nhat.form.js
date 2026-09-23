'use strict';
const { taoForm } = require('../../../../core/forms/form-builder');
const capNhatForm = taoForm('cap-nhat-tep', { method: 'POST' })
    .field('tenTep', 'text', { label: 'Tên tệp', required: true, minLength: 1, maxLength: 255, placeholder: 'Nhập tên tệp' })
    .field('moTa', 'textarea', { label: 'Mô tả', maxLength: 5000, rows: 5, placeholder: 'Nhập mô tả tệp' })
    .submit('Lưu thay đổi', { className: 'btn btn-primary' })
    .build();

module.exports = {
    capNhatForm
};