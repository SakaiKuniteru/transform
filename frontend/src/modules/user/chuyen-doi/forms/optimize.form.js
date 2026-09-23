'use strict';
const { taoForm } = require('../../../../core/forms/form-builder');
const { taoTepOptions } = require('./chuyen-dinh-dang.form');
const { DINH_DANG_ANH } = require('./hinh-anh.form');

function taoOptimizeForm(context = {}) {
    return taoForm('optimize-hinh-anh', { method: 'POST', action: '/user/chuyen-doi' })
        .field('formKey', 'hidden', { defaultValue: 'optimize' })
        .field('loaiChuyenDoi', 'hidden', { defaultValue: 'TOI_UU_HINH_ANH' })
        .field('tepNguonId', 'select', { label: 'Hình ảnh nguồn', required: true, defaultValue: context.tepDaChonId || '', placeholder: 'Chọn hình ảnh', options: taoTepOptions(context, DINH_DANG_ANH) })
        .field('chatLuong', 'range', { label: 'Chất lượng', min: 1, max: 100, step: 1, defaultValue: 85 })
        .field('mucNen', 'number', { label: 'Mức nén PNG', min: 0, max: 9, defaultValue: 9 })
        .field('giuMetadata', 'checkbox', { text: 'Giữ metadata', defaultValue: false })
        .field('progressive', 'checkbox', { text: 'JPEG progressive', defaultValue: true })
        .field('lossless', 'checkbox', { text: 'WebP lossless', defaultValue: false })
        .submit('Tối ưu hình ảnh', { className: 'btn btn-primary' })
        .build();
}

module.exports = {
    taoOptimizeForm
};