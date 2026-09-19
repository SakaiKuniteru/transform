'use strict';

const path = require('node:path');
const MIME_MAC_DINH = 'application/octet-stream';

const MIME_THEO_PHAN_MO_RONG = Object.freeze({
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.tif': 'image/tiff',
    '.tiff': 'image/tiff',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.zip': 'application/zip',
    '.7z': 'application/x-7z-compressed'
});

const PHAN_MO_RONG_THEO_MIME = Object.freeze({
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/bmp': '.bmp',
    'image/tiff': '.tiff',
    'image/svg+xml': '.svg',
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'text/plain': '.txt',
    'text/csv': '.csv',
    'application/json': '.json',
    'application/xml': '.xml',
    'text/xml': '.xml',
    'application/zip': '.zip',
    'application/x-7z-compressed': '.7z'
});

const NHOM_MIME = Object.freeze({
    HINH_ANH: 'HINH_ANH',
    PDF: 'PDF',
    TAI_LIEU: 'TAI_LIEU',
    BANG_TINH: 'BANG_TINH',
    TRINH_CHIEU: 'TRINH_CHIEU',
    VAN_BAN: 'VAN_BAN',
    NEN: 'NEN',
    KHAC: 'KHAC'
});

function chuanHoaMime(mime) {
    if (typeof mime !== 'string' || !mime.trim()) { return MIME_MAC_DINH; }
    return mime.split(';')[0].trim().toLowerCase() || MIME_MAC_DINH;
}

function layMimeTheoPhanMoRong(phanMoRong = '') {
    let extension = String(phanMoRong).trim().toLowerCase();
    if (extension && !extension.startsWith('.')) { extension = `.${extension}`; }
    return MIME_THEO_PHAN_MO_RONG[extension] || MIME_MAC_DINH;
}

function layMimeTheoTenTep(tenTep = '') {
    return layMimeTheoPhanMoRong(path.extname(String(tenTep)));
}

function layPhanMoRongTheoMime(mime) {
    return PHAN_MO_RONG_THEO_MIME[chuanHoaMime(mime)] || '';
}

function layNhomMime(mime) {
    const value = chuanHoaMime(mime);
    if (value.startsWith('image/')) { return NHOM_MIME.HINH_ANH; }
    if (value === 'application/pdf') { return NHOM_MIME.PDF; }
    if (value === 'application/msword' || value === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') { return NHOM_MIME.TAI_LIEU; }
    if (value === 'application/vnd.ms-excel' ||value === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') { return NHOM_MIME.BANG_TINH; }
    if (value === 'application/vnd.ms-powerpoint' || value === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') { return NHOM_MIME.TRINH_CHIEU; }
    if (value.startsWith('text/') || value === 'application/json' || value === 'application/xml') { return NHOM_MIME.VAN_BAN; }
    if (value === 'application/zip' || value === 'application/x-7z-compressed') { return NHOM_MIME.NEN; }
    return NHOM_MIME.KHAC;
}

function laMimeHinhAnh(mime) { return layNhomMime(mime) === NHOM_MIME.HINH_ANH; }

function laMimeDuocBiet(mime) {
    const value = chuanHoaMime(mime);

    return Object.prototype.hasOwnProperty.call(PHAN_MO_RONG_THEO_MIME, value);
}

module.exports = {
    MIME_MAC_DINH,
    MIME_THEO_PHAN_MO_RONG,
    PHAN_MO_RONG_THEO_MIME,
    NHOM_MIME,
    chuanHoaMime,
    layMimeTheoPhanMoRong,
    layMimeTheoTenTep,
    layPhanMoRongTheoMime,
    layNhomMime,
    laMimeHinhAnh,
    laMimeDuocBiet
};