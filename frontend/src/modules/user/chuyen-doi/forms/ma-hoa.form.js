'use strict';
const { taoForm } = require('../../../../core/forms/form-builder');
const { taoTepOptions } = require('./chuyen-dinh-dang.form');

function taoMaHoaForm(context = {}) {
    return taoForm('ma-hoa-base64', { method: 'POST', action: '/user/chuyen-doi' })
        .field('formKey', 'hidden', { defaultValue: 'ma-hoa' })
        .field('loaiChuyenDoi', 'hidden', { defaultValue: 'MA_HOA' })
        .field('tepNguonId', 'select', { label: 'Tệp nguồn', required: true, defaultValue: context.tepDaChonId || '', placeholder: 'Chọn tệp', options: taoTepOptions(context) })
        .field('urlSafe', 'checkbox', { text: 'Base64 URL-safe', defaultValue: false })
        .field('padding', 'checkbox', { text: 'Giữ padding "="', defaultValue: true })
        .field('dataUri', 'checkbox', { text: 'Xuất dạng Data URI', defaultValue: false })
        .field('lineLength', 'number', { label: 'Số ký tự mỗi dòng', min: 0, max: 1000, step: 4, defaultValue: 0, helpText: '0 nghĩa là không xuống dòng.' })
        .submit('Mã hóa Base64', { className: 'btn btn-primary' })
        .build();
}

module.exports = {
    taoMaHoaForm
};