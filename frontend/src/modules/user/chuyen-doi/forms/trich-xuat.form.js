'use strict';
const { taoForm } = require('../../../../core/forms/form-builder');
const { taoTepOptions } = require('./chuyen-dinh-dang.form');

function taoTrichXuatForm(context = {}) {
    return taoForm('trich-xuat', { method: 'POST', action: '/user/chuyen-doi' })
        .field('formKey', 'hidden', { defaultValue: 'trich-xuat' })
        .field('loaiChuyenDoi', 'hidden', { defaultValue: 'TRICH_XUAT' })
        .field('tepNguonId', 'select', { label: 'Tệp nguồn', required: true, defaultValue: context.tepDaChonId || '', placeholder: 'Chọn tệp', options: taoTepOptions(context) })
        .field('kieu', 'select', { label: 'Nội dung cần trích xuất', required: true, defaultValue: 'VAN_BAN', options: [ { value: 'VAN_BAN', label: 'Văn bản' }, { value: 'BANG', label: 'Bảng dữ liệu' }, { value: 'METADATA', label: 'Metadata' } ] })
        .field('giuNguyenMarkup', 'checkbox', { text: 'Giữ nguyên markup khi đọc HTML', defaultValue: false })
        .field('delimiter', 'text', { label: 'Dấu phân cách CSV', defaultValue: ',', maxLength: 4 })
        .field('maxRows', 'number', { label: 'Số dòng bảng tối đa', min: 1, max: 100000, defaultValue: 100000 })
        .submit('Trích xuất', { className: 'btn btn-primary' })
        .build();
}

module.exports = {
    taoTrichXuatForm
};