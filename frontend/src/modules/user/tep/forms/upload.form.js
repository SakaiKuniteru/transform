'use strict';
const { taoForm } = require('../../../../core/forms/form-builder');
const uploadForm = taoForm('upload-tep', { method: 'POST', action: '/user/tep/upload', attributes: { 'data-upload-form': 'true' } })
    .field('teps', 'file', { label: 'Chọn tệp', required: true, multiple: true, text: 'Có thể chọn nhiều tệp cùng lúc.', attributes: { 'data-upload-input': 'true' } })
    .submit('Tải tệp lên', { className: 'btn btn-primary' })
    .build();

module.exports = {
    uploadForm
};