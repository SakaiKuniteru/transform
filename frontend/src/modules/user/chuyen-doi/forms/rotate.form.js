'use strict';
const { taoForm } = require('../../../../core/forms/form-builder');
const { taoTepOptions } = require('./chuyen-dinh-dang.form');
const { DINH_DANG_ANH } = require('./hinh-anh.form');

function taoRotateForm(context = {}) {
    return taoForm('rotate-hinh-anh', { method: 'POST', action: '/user/chuyen-doi' })
        .field('formKey', 'hidden', { defaultValue: 'rotate' })
        .field('loaiChuyenDoi', 'hidden', { defaultValue: 'XOAY' })
        .field('tepNguonId', 'select', { label: 'Hình ảnh nguồn', required: true, defaultValue: context.tepDaChonId || '', placeholder: 'Chọn hình ảnh', options: taoTepOptions(context, DINH_DANG_ANH) })
        .field('goc', 'number', { label: 'Góc xoay', required: true, defaultValue: 90, step: 1 })
        .field('mauNen', 'text', { label: 'Màu nền', defaultValue: '#ffffff', placeholder: '#ffffff' })
        .submit('Xoay hình ảnh', { className: 'btn btn-primary' })
        .build();
}

module.exports = {
    taoRotateForm
};