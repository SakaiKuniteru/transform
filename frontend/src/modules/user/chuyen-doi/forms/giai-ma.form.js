'use strict';
const { taoForm } = require('../../../../core/forms/form-builder');
const { taoTepOptions, taoTatCaDinhDangOptions } = require('./chuyen-dinh-dang.form');

function taoGiaiMaForm(context = {}) {
    return taoForm('giai-ma-base64', { method: 'POST', action: '/user/chuyen-doi' })
        .field('formKey', 'hidden', { defaultValue: 'giai-ma' })
        .field('loaiChuyenDoi', 'hidden', { defaultValue: 'GIAI_MA' })
        .field('tepNguonId', 'select', { label: 'Tệp Base64', required: true, defaultValue: context.tepDaChonId || '', placeholder: 'Chọn tệp Base64', options: taoTepOptions(context, [ 'base64' ]) })
        .field('dinhDangDich', 'select', { label: 'Định dạng sau giải mã', required: true, placeholder: 'Chọn định dạng thực tế', options: taoTatCaDinhDangOptions({ boQua: [ 'base64', 'base32', 'hex' ] }) })
        .field('urlSafe', 'checkbox', { text: 'Dữ liệu dùng Base64 URL-safe', defaultValue: false })
        .field('choPhepKhoangTrang', 'checkbox', { text: 'Cho phép khoảng trắng và xuống dòng', defaultValue: true })
        .submit('Giải mã Base64', { className: 'btn btn-primary' })
        .build();
}

module.exports = {
    taoGiaiMaForm
};