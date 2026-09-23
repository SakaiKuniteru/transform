'use strict';
const { taoForm } = require('../../../../core/forms/form-builder');
const { taoTepOptions } = require('./chuyen-dinh-dang.form');
const DINH_DANG_OCR = Object.freeze([ 'png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff', 'tif' ]);

function taoOcrForm(context = {}) {
    return taoForm('ocr', { method: 'POST', action: '/user/chuyen-doi' })
        .field('formKey', 'hidden', { defaultValue: 'ocr' })
        .field('loaiChuyenDoi', 'hidden', { defaultValue: 'OCR' })
        .field('tepNguonId', 'select', { label: 'Ảnh cần OCR', required: true, defaultValue: context.tepDaChonId || '', placeholder: 'Chọn hình ảnh', options: taoTepOptions(context, DINH_DANG_OCR) })
        .field('ngonNgu', 'text', { label: 'Ngôn ngữ OCR', required: true, defaultValue: 'vie+eng', placeholder: 'vie+eng' })
        .field('psm', 'number', { label: 'PSM', min: 0, max: 13, placeholder: 'Để trống dùng mặc định' })
        .field('oem', 'number', { label: 'OEM', min: 0, max: 3, placeholder: 'Để trống dùng mặc định' })
        .field('preserveInterwordSpaces', 'checkbox', { text: 'Giữ khoảng trắng giữa các từ', defaultValue: false })
        .submit('Nhận dạng văn bản', { className: 'btn btn-primary' })
        .build();
}

module.exports = {
    DINH_DANG_OCR,
    taoOcrForm
};