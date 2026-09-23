'use strict';

const { taoForm } = require('../../../../core/forms/form-builder');
const { CHU_KY_OPTIONS } = require('../goi-dich-vu.service');

function kiemTraGoi(values) {
    if (values.yeuCauThanhToan === false && Number(values.gia || 0) !== 0) { return { gia: 'Gói không yêu cầu thanh toán phải có giá bằng 0.' }; }
    if (values.chuKy !== 'MOT_LAN' && (!Number.isSafeInteger(Number(values.soChuKy)) || Number(values.soChuKy) <= 0)) { return { soChuKy: 'Số chu kỳ phải là số nguyên dương.' }; }
    return null;
}

const taoGoiForm = taoForm('admin-tao-goi-dich-vu', {
    method: 'POST',
    action: '/admin/goi-dich-vu/tao'
})
    .field('ma', 'text', {
        label: 'Mã gói',
        required: true,
        maxLength: 50,
        pattern: '^[A-Za-z0-9_-]+$',
        placeholder: 'VD: BASIC_MONTHLY'
    })
    .field('ten', 'text', {
        label: 'Tên gói',
        required: true,
        maxLength: 255,
        placeholder: 'Nhập tên gói dịch vụ'
    })
    .field('moTa', 'textarea', {
        label: 'Mô tả',
        rows: 4,
        placeholder: 'Mô tả gói dịch vụ'
    })
    .field('gia', 'number', {
        label: 'Giá',
        required: true,
        min: 0,
        step: 0.01,
        defaultValue: 0
    })
    .field('tienTe', 'text', {
        label: 'Tiền tệ',
        required: true,
        minLength: 3,
        maxLength: 3,
        pattern: '^[A-Za-z]{3}$',
        defaultValue: 'VND'
    })
    .field('yeuCauThanhToan', 'toggle', {
        text: 'Yêu cầu thanh toán',
        defaultValue: true
    })
    .field('chuKy', 'select', {
        label: 'Chu kỳ',
        required: true,
        defaultValue: 'THANG',
        options: CHU_KY_OPTIONS
    })
    .field('soChuKy', 'number', {
        label: 'Số chu kỳ',
        required: true,
        min: 1,
        step: 1,
        defaultValue: 1
    })
    .field('thuTu', 'number', {
        label: 'Thứ tự hiển thị',
        required: true,
        min: 0,
        step: 1,
        defaultValue: 0
    })
    .field('active', 'toggle', {
        text: 'Kích hoạt gói',
        defaultValue: true
    })
    .validate(kiemTraGoi)
    .submit('Tạo gói dịch vụ', {
        className: 'btn btn-primary'
    })
    .build();

module.exports = {
    kiemTraGoi,
    taoGoiForm
};