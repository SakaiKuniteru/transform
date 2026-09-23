'use strict';
const { taoForm } = require('../../../../core/forms/form-builder');
const { taoTepOptions } = require('./chuyen-dinh-dang.form');

function taoAiTextForm(context = {}) {
    return taoForm('ai-text', { method: 'POST', action: '/user/chuyen-doi' })
        .field('formKey', 'hidden', { defaultValue: 'ai-text' })
        .field('tepNguonId', 'select', { label: 'Tệp văn bản', required: true, defaultValue: context.tepDaChonId || '', placeholder: 'Chọn tệp TXT', options: taoTepOptions(context, [ 'txt' ]) })
        .field('loaiChuyenDoi', 'select', { label: 'Tác vụ AI', required: true, defaultValue: 'TOM_TAT', options: [ { value: 'TOM_TAT', label: 'Tóm tắt' }, { value: 'CHINH_SUA', label: 'Chỉnh sửa' }, { value: 'KIEM_TRA', label: 'Kiểm tra' }, { value: 'CHUAN_HOA', label: 'Chuẩn hóa' }, { value: 'THU_GON', label: 'Thu gọn' }, { value: 'DINH_DANG_LAI', label: 'Định dạng lại' }, { value: 'THAY_THE', label: 'Thay thế' } ] })
        .field('chiDan', 'textarea', { label: 'Yêu cầu bổ sung', rows: 5, maxLength: 5000, placeholder: 'Ví dụ: Giữ giọng văn trang trọng và giữ nguyên các thuật ngữ kỹ thuật.' })
        .submit('Xử lý bằng AI', { className: 'btn btn-primary' })
        .build();
}

module.exports = {
    taoAiTextForm
};