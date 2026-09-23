'use strict';
const { taoForm } = require('../../../../core/forms/form-builder');
const { taoTepOptions } = require('./chuyen-dinh-dang.form');
const NGON_NGU = Object.freeze([
    Object.freeze({ value: 'auto', label: 'Tự động nhận diện' }),
    Object.freeze({ value: 'vi', label: 'Tiếng Việt' }),
    Object.freeze({ value: 'en', label: 'Tiếng Anh' }),
    Object.freeze({ value: 'zh', label: 'Tiếng Trung' }),
    Object.freeze({ value: 'ja', label: 'Tiếng Nhật' }),
    Object.freeze({ value: 'ko', label: 'Tiếng Hàn' }),
    Object.freeze({ value: 'ru', label: 'Tiếng Nga' }),
    Object.freeze({ value: 'ar', label: 'Tiếng Ả Rập' }),
    Object.freeze({ value: 'th', label: 'Tiếng Thái' }),
    Object.freeze({ value: 'hi', label: 'Tiếng Hindi' })
]);

function taoDichForm(context = {}) {
    return taoForm('dich', { method: 'POST', action: '/user/chuyen-doi' })
        .field('formKey', 'hidden', { defaultValue: 'dich' })
        .field('loaiChuyenDoi', 'hidden', { defaultValue: 'DICH' })
        .field('tepNguonId', 'select', { label: 'Tệp văn bản nguồn', required: true, defaultValue: context.tepDaChonId || '', placeholder: 'Chọn tệp TXT', options: taoTepOptions(context, [ 'txt' ]) })
        .field('ngonNguNguon', 'select', { label: 'Ngôn ngữ nguồn', required: true, defaultValue: 'auto', options: NGON_NGU })
        .field('ngonNguDich', 'select', { label: 'Ngôn ngữ đích', required: true, placeholder: 'Chọn ngôn ngữ', options: NGON_NGU.filter((item) => item.value !== 'auto') })
        .field('maxChars', 'number', { label: 'Số ký tự mỗi đoạn', min: 100, max: 50000, defaultValue: 4000 })
        .submit('Dịch văn bản', { className: 'btn btn-primary' })
        .build();
}

module.exports = {
    NGON_NGU,
    taoDichForm
};