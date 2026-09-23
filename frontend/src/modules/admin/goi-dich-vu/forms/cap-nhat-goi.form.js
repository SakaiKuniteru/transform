'use strict';

const { taoForm } = require('../../../../core/forms/form-builder');
const { CHU_KY_OPTIONS } = require('../goi-dich-vu.service');
const { kiemTraGoi } = require('./tao-goi.form');

function taoCapNhatGoiForm(context = {}) {
    if (!context.id) { throw new TypeError('Thiếu ID gói dịch vụ.'); }
    return taoForm('admin-cap-nhat-goi-dich-vu', {
        method: 'POST',
        action: `/admin/goi-dich-vu/${context.id}/cap-nhat`
    })
        .field('ma', 'text', {
            label: 'Mã gói',
            required: true,
            maxLength: 50,
            pattern: '^[A-Za-z0-9_-]+$'
        })
        .field('ten', 'text', {
            label: 'Tên gói',
            required: true,
            maxLength: 255
        })
        .field('moTa', 'textarea', {
            label: 'Mô tả',
            rows: 4
        })
        .field('gia', 'number', {
            label: 'Giá',
            required: true,
            min: 0,
            step: 0.01
        })
        .field('tienTe', 'text', {
            label: 'Tiền tệ',
            required: true,
            minLength: 3,
            maxLength: 3,
            pattern: '^[A-Za-z]{3}$'
        })
        .field('yeuCauThanhToan', 'toggle', {
            text: 'Yêu cầu thanh toán'
        })
        .field('chuKy', 'select', {
            label: 'Chu kỳ',
            required: true,
            options: CHU_KY_OPTIONS
        })
        .field('soChuKy', 'number', {
            label: 'Số chu kỳ',
            required: true,
            min: 1,
            step: 1
        })
        .field('thuTu', 'number', {
            label: 'Thứ tự hiển thị',
            required: true,
            min: 0,
            step: 1
        })
        .field('active', 'toggle', {
            text: 'Kích hoạt gói'
        })
        .validate(kiemTraGoi)
        .submit('Lưu thay đổi', {
            className: 'btn btn-primary'
        })
        .build();
}

module.exports = {
    taoCapNhatGoiForm
};