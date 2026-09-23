'use strict';
const { taoForm } = require('../../../../core/forms/form-builder');
const { taoTepOptions, taoDinhDangOptions } = require('./chuyen-dinh-dang.form');
const DINH_DANG_ANH = Object.freeze([ 'png', 'jpg', 'jpeg', 'webp' ]);

function taoHinhAnhForm(context = {}) {
    return taoForm('chuyen-doi-hinh-anh', { method: 'POST', action: '/user/chuyen-doi' })
        .field('formKey', 'hidden', { defaultValue: 'hinh-anh' })
        .field('loaiChuyenDoi', 'hidden', { defaultValue: 'CHUYEN_DINH_DANG' })
        .field('tepNguonId', 'select', { label: 'Hình ảnh nguồn', required: true, defaultValue: context.tepDaChonId || '', placeholder: 'Chọn hình ảnh', options: taoTepOptions(context, DINH_DANG_ANH) })
        .field('dinhDangDich', 'select', { label: 'Định dạng ảnh đích', required: true, placeholder: 'Chọn định dạng', options: taoDinhDangOptions([ 'png', 'jpeg', 'webp' ]) })
        .field('chatLuong', 'range', { label: 'Chất lượng', min: 1, max: 100, step: 1, defaultValue: 85 })
        .field('giuMetadata', 'checkbox', { text: 'Giữ metadata ảnh', defaultValue: false })
        .field('mauNen', 'text', { label: 'Màu nền', defaultValue: '#ffffff', placeholder: '#ffffff' })
        .submit('Chuyển đổi ảnh', { className: 'btn btn-primary' })
        .build();
}

module.exports = {
    DINH_DANG_ANH,
    taoHinhAnhForm
};