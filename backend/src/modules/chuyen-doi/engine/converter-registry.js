'use strict';

const { coLoaiChuyenDoi } = require('../../../constants/loai-chuyen-doi');
const { chuanHoaDinhDang, coDinhDang } = require('../../../constants/dinh-dang-tep');

const converters = new Map();

function chuanHoaChuoi(value, ten) {
    const text = String(value || '').trim();
    if (!text) { throw new TypeError(`${ten} không được để trống.`); }
    return text;
}

function chuanHoaDanhSach(value, chuanHoa, ten, macDinh = ['*']) {
    if (value === undefined || value === null) { return Object.freeze([...macDinh]); }
    const danhSach = Array.isArray(value) ? value : [value];
    if (!danhSach.length) { return Object.freeze([...macDinh]); }
    const ketQua = [...new Set(danhSach.map((item) => item === '*' ? '*' : chuanHoa(item)).filter(Boolean))];
    if (!ketQua.length) { throw new TypeError(`${ten} không hợp lệ.`); }
    return Object.freeze(ketQua);
}

function chuanHoaLoaiChuyenDoi(value) {
    const danhSach = Array.isArray(value) ? value : [value];
    if (!danhSach.length) { throw new TypeError('Loại chuyển đổi không được để trống.'); }
    const ketQua = [...new Set(danhSach.map((item) => String(item || '').trim().toUpperCase()))];
    if (ketQua.some((item) => !coLoaiChuyenDoi(item))) { throw new TypeError('Loại chuyển đổi không hợp lệ.'); }
    return Object.freeze(ketQua);
}

function chuanHoaDinhDangConverter(value, ten) {
    return chuanHoaDanhSach(value, (item) => {
        const dinhDang = chuanHoaDinhDang(item);
        if (!coDinhDang(dinhDang)) { throw new TypeError(`${ten} "${item}" không được hỗ trợ.`); }
        return dinhDang;
    }, ten);
}

function chuanHoaNhomXuLy(value) {
    return chuanHoaDanhSach(value, (item) => String(item || '').trim().toUpperCase(), 'Nhóm xử lý');
}

function chuanHoaSo(value, ten, macDinh, min) {
    const number = value === undefined || value === null ? macDinh : Number(value);
    if (!Number.isFinite(number) || number < min) { throw new TypeError(`${ten} không hợp lệ.`); }
    return number;
}

function chuanHoaConverter(converter) {
    if (!converter || typeof converter !== 'object' || Array.isArray(converter)) { throw new TypeError('Converter phải là một object.'); }
    if (typeof converter.xuLy !== 'function') { throw new TypeError('Converter phải có hàm xuLy(context).'); }
    if (converter.hoTro !== undefined && typeof converter.hoTro !== 'function') { throw new TypeError('converter.hoTro phải là function nếu được cung cấp.'); }
    return Object.freeze({
        key: chuanHoaChuoi(converter.key, 'Converter key'),
        ten: String(converter.ten || converter.key).trim(),
        loaiChuyenDoi: chuanHoaLoaiChuyenDoi(converter.loaiChuyenDoi),
        nhomXuLy: chuanHoaNhomXuLy(converter.nhomXuLy),
        dinhDangNguon: chuanHoaDinhDangConverter(converter.dinhDangNguon, 'Định dạng nguồn'),
        dinhDangDich: chuanHoaDinhDangConverter(converter.dinhDangDich, 'Định dạng đích'),
        uuTien: chuanHoaSo(converter.uuTien, 'Ưu tiên converter', 100, 0),
        chiPhi: chuanHoaSo(converter.chiPhi, 'Chi phí converter', 1, 0.000001),
        engine: converter.engine ? String(converter.engine).trim() : null,
        phienBanEngine: converter.phienBanEngine ? String(converter.phienBanEngine).trim() : null,
        metadata: Object.freeze({ ...(converter.metadata || {}) }),
        hoTro: converter.hoTro || null,
        xuLy: converter.xuLy
    });
}

function dangKyConverter(converter, options = {}) {
    const item = chuanHoaConverter(converter);
    if (converters.has(item.key) && options.thayThe !== true) { throw new Error(`Converter "${item.key}" đã được đăng ký.`); }
    converters.set(item.key, item);
    return item;
}

function huyDangKyConverter(key) {
    const converterKey = chuanHoaChuoi(key, 'Converter key');
    const item = converters.get(converterKey) || null;
    converters.delete(converterKey);
    return item;
}

function layConverter(key) {
    const converterKey = chuanHoaChuoi(key, 'Converter key');
    return converters.get(converterKey) || null;
}

function layDanhSachConverter() { return Array.from(converters.values()); }

function xoaTatCaConverter() { converters.clear(); }

function phuHopDanhSach(danhSach, value) {
    if (!value) { return true; }
    return danhSach.includes('*') || danhSach.includes(value);
}

function phuHopConverter(converter, query = {}) {
    const loai = query.loaiChuyenDoi ? String(query.loaiChuyenDoi).trim().toUpperCase() : null;
    const nhom = query.nhomXuLy ? String(query.nhomXuLy).trim().toUpperCase() : null;
    const nguon = query.dinhDangNguon ? chuanHoaDinhDang(query.dinhDangNguon) : null;
    const dich = query.dinhDangDich ? chuanHoaDinhDang(query.dinhDangDich) : null;
    if (loai && !converter.loaiChuyenDoi.includes(loai)) { return false; }
    if (!phuHopDanhSach(converter.nhomXuLy, nhom)) { return false; }
    if (!phuHopDanhSach(converter.dinhDangNguon, nguon)) { return false; }
    if (!phuHopDanhSach(converter.dinhDangDich, dich)) { return false; }
    return true;
}

async function coHoTro(converter, context = {}) {
    if (!converter?.hoTro) { return true; }
    return Boolean(await converter.hoTro(context));
}

async function timConverter(query = {}, context = {}) {
    const ketQua = [];
    for (const converter of converters.values()) {
        if (!phuHopConverter(converter, query)) { continue; }
        if (!await coHoTro(converter, context)) { continue; }
        ketQua.push(converter);
    }
    return ketQua.sort((a, b) => b.uuTien - a.uuTien || a.chiPhi - b.chiPhi || a.key.localeCompare(b.key));
}

async function chonConverter(query = {}, context = {}) {
    const danhSach = await timConverter(query, context);
    return danhSach[0] || null;
}

module.exports = {
    dangKyConverter,
    huyDangKyConverter,
    layConverter,
    layDanhSachConverter,
    xoaTatCaConverter,
    phuHopConverter,
    coHoTro,
    timConverter,
    chonConverter
};