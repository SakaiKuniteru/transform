'use strict';
const { taoForm } = require('../../../../core/forms/form-builder');
const { taoTepOptions } = require('./chuyen-dinh-dang.form');

function taoNenForm(context = {}) {
    return taoForm('nen-gzip', { method: 'POST', action: '/user/chuyen-doi' })
        .field('formKey', 'hidden', { defaultValue: 'nen' })
        .field('loaiChuyenDoi', 'hidden', { defaultValue: 'NEN' })
        .field('tepNguonId', 'select', { label: 'Tệp nguồn', required: true, defaultValue: context.tepDaChonId || '', placeholder: 'Chọn tệp', options: taoTepOptions(context) })
        .field('level', 'range', { label: 'Mức nén', min: 0, max: 9, step: 1, defaultValue: 6 })
        .submit('Nén GZIP', { className: 'btn btn-primary' })
        .build();
}

module.exports = {
    taoNenForm
};