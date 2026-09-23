'use strict';
const { taoForm } = require('../../../../core/forms/form-builder');
const { taoTepOptions } = require('./chuyen-dinh-dang.form');
const { DINH_DANG_ANH } = require('./hinh-anh.form');

function taoCropForm(context = {}) {
    return taoForm('crop-hinh-anh', { method: 'POST', action: '/user/chuyen-doi' })
        .field('formKey', 'hidden', { defaultValue: 'crop' })
        .field('loaiChuyenDoi', 'hidden', { defaultValue: 'CAT' })
        .field('tepNguonId', 'select', { label: 'Hình ảnh nguồn', required: true, defaultValue: context.tepDaChonId || '', placeholder: 'Chọn hình ảnh', options: taoTepOptions(context, DINH_DANG_ANH) })
        .field('x', 'number', { label: 'Tọa độ X', required: true, min: 0, defaultValue: 0 })
        .field('y', 'number', { label: 'Tọa độ Y', required: true, min: 0, defaultValue: 0 })
        .field('chieuRong', 'number', { label: 'Chiều rộng vùng cắt', required: true, min: 1 })
        .field('chieuCao', 'number', { label: 'Chiều cao vùng cắt', required: true, min: 1 })
        .submit('Cắt hình ảnh', { className: 'btn btn-primary' })
        .build();
}

module.exports = {
    taoCropForm
};