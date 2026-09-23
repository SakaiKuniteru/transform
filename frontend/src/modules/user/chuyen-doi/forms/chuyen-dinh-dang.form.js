'use strict';
const { dinhDangTep } = require('@transform/shared');
const { taoForm } = require('../../../../core/forms/form-builder');

function taoTepOptions(context = {}, dinhDangChoPhep = null) {
    const tapChoPhep = Array.isArray(dinhDangChoPhep) ? new Set(dinhDangChoPhep) : null;
    return (context.teps || []).filter((tep) => !tapChoPhep || tapChoPhep.has(tep.dinhDang)).map((tep) => ({ value: tep.id, label: `${tep.tenTep} (${String(tep.dinhDang || '').toUpperCase()})` }));
}

function taoDinhDangOptions(danhSach = []) {
    const ketQua = [];
    const daCo = new Set();
    for (const dinhDang of danhSach.flat(Infinity)) {
        if (!dinhDang || dinhDang === '*' || daCo.has(dinhDang)) { continue; }
        const thongTin = dinhDangTep.layThongTinDinhDang(dinhDang);
        if (!thongTin) { continue; }
        daCo.add(dinhDang);
        ketQua.push({ value: dinhDang, label: thongTin.ten });
    }
    return ketQua;
}

function taoDinhDangOptionsTuHoTro(context = {}) {
    return taoDinhDangOptions((context.hoTro || []).flatMap((item) => item.dinhDangDich || []));
}

function taoTatCaDinhDangOptions(options = {}) {
    const boQua = new Set(options.boQua || []);
    return dinhDangTep.layDanhSachDinhDang().filter((item) => !boQua.has(item.ma)).map((item) => ({ value: item.ma, label: item.ten }));
}

function taoChuyenDinhDangForm(context = {}) {
    return taoForm('chuyen-dinh-dang', { method: 'POST', action: '/user/chuyen-doi' })
        .field('formKey', 'hidden', { defaultValue: 'chuyen-dinh-dang' })
        .field('loaiChuyenDoi', 'hidden', { defaultValue: 'CHUYEN_DINH_DANG' })
        .field('tepNguonId', 'select', { label: 'Tệp nguồn', required: true, defaultValue: context.tepDaChonId || '', placeholder: 'Chọn tệp', options: taoTepOptions(context), attributes: { 'data-conversion-source': 'true' } })
        .field('dinhDangDich', 'select', { label: 'Định dạng đích', required: true, placeholder: 'Chọn định dạng đích', options: taoDinhDangOptionsTuHoTro(context), attributes: { 'data-conversion-target': 'true' } })
        .field('soBuocToiDa', 'number', { label: 'Số bước chuyển đổi tối đa', min: 1, max: 8, defaultValue: 8 })
        .submit('Chuyển đổi', { className: 'btn btn-primary' })
        .build();
}

module.exports = {
    taoTepOptions,
    taoDinhDangOptions,
    taoDinhDangOptionsTuHoTro,
    taoTatCaDinhDangOptions,
    taoChuyenDinhDangForm
};