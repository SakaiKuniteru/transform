'use strict';
const { taoForm } = require('../../../../core/forms/form-builder');
const { taoTepOptions, taoTatCaDinhDangOptions } = require('./chuyen-dinh-dang.form');

function taoGiaiNenForm(context = {}) {
    return taoForm('giai-nen-gzip', { method: 'POST', action: '/user/chuyen-doi' })
        .field('formKey', 'hidden', { defaultValue: 'giai-nen' })
        .field('loaiChuyenDoi', 'hidden', { defaultValue: 'GIAI_NEN' })
        .field('tepNguonId', 'select', { label: 'Tệp GZIP', required: true, defaultValue: context.tepDaChonId || '', placeholder: 'Chọn tệp GZIP', options: taoTepOptions(context, [ 'gz' ]) })
        .field('dinhDangDich', 'select', { label: 'Định dạng dữ liệu bên trong', required: true, placeholder: 'Chọn định dạng', options: taoTatCaDinhDangOptions({ boQua: [ 'gz' ] }) })
        .submit('Giải nén', { className: 'btn btn-primary' })
        .build();
}

module.exports = {
    taoGiaiNenForm
};