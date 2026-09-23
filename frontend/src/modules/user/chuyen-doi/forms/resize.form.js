'use strict';
const { taoForm } = require('../../../../core/forms/form-builder');
const { taoTepOptions } = require('./chuyen-dinh-dang.form');
const { DINH_DANG_ANH } = require('./hinh-anh.form');

function taoResizeForm(context = {}) {
    return taoForm('resize-hinh-anh', { method: 'POST', action: '/user/chuyen-doi' })
        .field('formKey', 'hidden', { defaultValue: 'resize' })
        .field('loaiChuyenDoi', 'hidden', { defaultValue: 'DOI_KICH_THUOC' })
        .field('tepNguonId', 'select', { label: 'Hình ảnh nguồn', required: true, defaultValue: context.tepDaChonId || '', placeholder: 'Chọn hình ảnh', options: taoTepOptions(context, DINH_DANG_ANH) })
        .field('chieuRong', 'number', { label: 'Chiều rộng', min: 1, placeholder: 'Ví dụ: 1920' })
        .field('chieuCao', 'number', { label: 'Chiều cao', min: 1, placeholder: 'Ví dụ: 1080' })
        .field('cheDo', 'select', { label: 'Chế độ resize', defaultValue: 'cover', options: [ { value: 'cover', label: 'Cover' }, { value: 'contain', label: 'Contain' }, { value: 'fill', label: 'Fill' }, { value: 'inside', label: 'Inside' }, { value: 'outside', label: 'Outside' } ] })
        .field('viTri', 'select', { label: 'Vị trí', defaultValue: 'centre', options: [ { value: 'centre', label: 'Giữa' }, { value: 'north', label: 'Trên' }, { value: 'south', label: 'Dưới' }, { value: 'east', label: 'Phải' }, { value: 'west', label: 'Trái' }, { value: 'entropy', label: 'Entropy' }, { value: 'attention', label: 'Attention' } ] })
        .field('khongPhongTo', 'checkbox', { text: 'Không phóng to ảnh nhỏ hơn kích thước yêu cầu', defaultValue: true })
        .validate((values) => !values.chieuRong && !values.chieuCao ? { chieuRong: 'Phải nhập chiều rộng hoặc chiều cao.' } : null)
        .submit('Đổi kích thước', { className: 'btn btn-primary' })
        .build();
}

module.exports = {
    taoResizeForm
};