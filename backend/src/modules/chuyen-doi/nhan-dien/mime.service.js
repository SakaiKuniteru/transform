'use strict';

const path = require('node:path');
const mimeTypes = require('mime-types');
const { DINH_DANG, layDanhSachDinhDang, layThongTinDinhDang, chuanHoaDinhDang, coDinhDang } = require('../../../constants/dinh-dang-tep');

const MIME_MAC_DINH = 'application/octet-stream';
const DINH_DANG_THEO_PHAN_MO_RONG = new Map();
const DINH_DANG_THEO_MIME = new Map();

for (const item of layDanhSachDinhDang()) {
    for (const extension of item.extensions || []) {
        const key = String(extension).trim().toLowerCase().replace(/^\./, '');
        if (!DINH_DANG_THEO_PHAN_MO_RONG.has(key)) { DINH_DANG_THEO_PHAN_MO_RONG.set(key, []); }
        DINH_DANG_THEO_PHAN_MO_RONG.get(key).push(item.ma);
    }
    for (const mime of item.mimeTypes || []) {
        const key = String(mime).trim().toLowerCase();
        if (!DINH_DANG_THEO_MIME.has(key)) { DINH_DANG_THEO_MIME.set(key, []); }
        DINH_DANG_THEO_MIME.get(key).push(item.ma);
    }
}

function chuanHoaMime(value) {
    const mime = String(value || '').split(';')[0].trim().toLowerCase();
    return mime || MIME_MAC_DINH;
}

function chuanHoaPhanMoRong(value) {
    const text = String(value || '').trim().toLowerCase();
    if (!text) { return ''; }
    const extension = text.includes('/') || text.includes('\\') || text.includes('.') ? path.extname(text) : text;
    return String(extension || text).replace(/^\./, '');
}

function layDanhSachDinhDangTheoPhanMoRong(value) {
    const extension = chuanHoaPhanMoRong(value);
    return extension ? [...(DINH_DANG_THEO_PHAN_MO_RONG.get(extension) || [])] : [];
}

function layDinhDangTheoPhanMoRong(value) {
    const danhSach = layDanhSachDinhDangTheoPhanMoRong(value);
    return danhSach[0] || null;
}

function layDanhSachDinhDangTheoMime(value) {
    const mime = chuanHoaMime(value);
    if (mime === MIME_MAC_DINH) { return []; }
    return [...(DINH_DANG_THEO_MIME.get(mime) || [])];
}

function layDinhDangTheoMime(value, uuTien = null) {
    const danhSach = layDanhSachDinhDangTheoMime(value);
    const dinhDangUuTien = chuanHoaDinhDang(uuTien);
    if (dinhDangUuTien && danhSach.includes(dinhDangUuTien)) { return dinhDangUuTien; }
    return danhSach[0] || null;
}

function layMimeTheoPhanMoRong(value) {
    const extension = chuanHoaPhanMoRong(value);
    if (!extension) { return MIME_MAC_DINH; }
    return chuanHoaMime(mimeTypes.lookup(extension) || MIME_MAC_DINH);
}

function layMimeChinhTheoDinhDang(value) {
    const thongTin = layThongTinDinhDang(value);
    return thongTin?.mimeTypes?.[0] || MIME_MAC_DINH;
}

function mimePhuHopDinhDang(mime, dinhDang) {
    const thongTin = layThongTinDinhDang(dinhDang);
    if (!thongTin) { return false; }
    const mimeChuan = chuanHoaMime(mime);
    return (thongTin.mimeTypes || []).some((item) => chuanHoaMime(item) === mimeChuan);
}

function batDauBang(buffer, bytes, offset = 0) {
    if (!Buffer.isBuffer(buffer) || buffer.length < offset + bytes.length) { return false; }
    for (let index = 0; index < bytes.length; index += 1) { if (buffer[offset + index] !== bytes[index]) { return false; } }
    return true;
}

function coChuoiTai(buffer, value, offset = 0, encoding = 'ascii') {
    if (!Buffer.isBuffer(buffer)) { return false; }
    return batDauBang(buffer, Buffer.from(value, encoding), offset);
}

function taoKetQuaSignature(dinhDang, signature, doTinCay = 'CAO') {
    const format = chuanHoaDinhDang(dinhDang);
    return {
        dinhDang: format && coDinhDang(format) ? format : null,
        mimeType: format && coDinhDang(format) ? layMimeChinhTheoDinhDang(format) : MIME_MAC_DINH,
        signature,
        doTinCay
    };
}

function nhanDienSignature(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) { return null; }
    if (batDauBang(buffer, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) { return taoKetQuaSignature(DINH_DANG.PNG, 'PNG'); }
    if (batDauBang(buffer, [0xFF, 0xD8, 0xFF])) { return taoKetQuaSignature(DINH_DANG.JPEG, 'JPEG'); }
    if (coChuoiTai(buffer, 'GIF87a') || coChuoiTai(buffer, 'GIF89a')) { return taoKetQuaSignature(DINH_DANG.GIF, 'GIF'); }
    if (coChuoiTai(buffer, 'BM')) { return taoKetQuaSignature(DINH_DANG.BMP, 'BMP'); }
    if (batDauBang(buffer, [0x49, 0x49, 0x2A, 0x00]) || batDauBang(buffer, [0x4D, 0x4D, 0x00, 0x2A])) { return taoKetQuaSignature(DINH_DANG.TIFF, 'TIFF'); }
    if (coChuoiTai(buffer, 'RIFF') && coChuoiTai(buffer, 'WEBP', 8)) { return taoKetQuaSignature(DINH_DANG.WEBP, 'WEBP'); }
    if (buffer.length >= 16 && coChuoiTai(buffer, 'ftyp', 4)) {
        const brand = buffer.subarray(8, Math.min(buffer.length, 32)).toString('ascii').toLowerCase();
        if (brand.includes('avif') || brand.includes('avis')) { return taoKetQuaSignature(DINH_DANG.AVIF, 'AVIF'); }
    }
    if (coChuoiTai(buffer, '%PDF-')) { return taoKetQuaSignature(DINH_DANG.PDF, 'PDF'); }
    if (batDauBang(buffer, [0x50, 0x4B, 0x03, 0x04]) || batDauBang(buffer, [0x50, 0x4B, 0x05, 0x06]) || batDauBang(buffer, [0x50, 0x4B, 0x07, 0x08])) { return taoKetQuaSignature(DINH_DANG.ZIP, 'ZIP'); }
    if (batDauBang(buffer, [0x1F, 0x8B])) { return taoKetQuaSignature(DINH_DANG.GZIP, 'GZIP'); }
    if (batDauBang(buffer, [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C])) { return taoKetQuaSignature(DINH_DANG.SEVEN_ZIP, '7Z'); }
    if (coChuoiTai(buffer, 'BZh')) { return taoKetQuaSignature(DINH_DANG.BZ2, 'BZIP2'); }
    if (batDauBang(buffer, [0xFD, 0x37, 0x7A, 0x58, 0x5A, 0x00])) { return taoKetQuaSignature(DINH_DANG.XZ, 'XZ'); }
    if (buffer.length >= 262 && coChuoiTai(buffer, 'ustar', 257)) { return taoKetQuaSignature(DINH_DANG.TAR, 'TAR'); }
    if (batDauBang(buffer, [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1])) { return { dinhDang: null, mimeType: 'application/x-ole-storage', signature: 'OLE', doTinCay: 'CAO' }; }
    if (coChuoiTai(buffer, '{\\rtf')) { return taoKetQuaSignature(DINH_DANG.RTF, 'RTF'); }
    return null;
}

module.exports = {
    MIME_MAC_DINH,
    chuanHoaMime,
    chuanHoaPhanMoRong,
    layDanhSachDinhDangTheoPhanMoRong,
    layDinhDangTheoPhanMoRong,
    layDanhSachDinhDangTheoMime,
    layDinhDangTheoMime,
    layMimeTheoPhanMoRong,
    layMimeChinhTheoDinhDang,
    mimePhuHopDinhDang,
    nhanDienSignature
};