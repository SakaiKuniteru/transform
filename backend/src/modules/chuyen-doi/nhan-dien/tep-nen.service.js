'use strict';

const AdmZip = require('adm-zip');
const { DINH_DANG, NHOM_DINH_DANG, layThongTinDinhDang, chuanHoaDinhDang } = require('../../../constants/dinh-dang-tep');

const DINH_DANG_TEP_NEN = new Set([
    DINH_DANG.ZIP,
    DINH_DANG.GZIP,
    DINH_DANG.TAR,
    DINH_DANG.TGZ,
    DINH_DANG.BZ2,
    DINH_DANG.XZ,
    DINH_DANG.SEVEN_ZIP
]);

function batDauBang(buffer, bytes, offset = 0) {
    if (!Buffer.isBuffer(buffer) || buffer.length < offset + bytes.length) { return false; }
    for (let index = 0; index < bytes.length; index += 1) { if (buffer[offset + index] !== bytes[index]) { return false; } }
    return true;
}

function coChuoiTai(buffer, value, offset = 0) {
    if (!Buffer.isBuffer(buffer)) { return false; }
    return batDauBang(buffer, Buffer.from(value, 'ascii'), offset);
}

function laDinhDangTepNen(value) {
    const dinhDang = chuanHoaDinhDang(value);
    return Boolean(dinhDang && DINH_DANG_TEP_NEN.has(dinhDang));
}

function nhanDienDinhDangNen(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) { return null; }
    if (batDauBang(buffer, [0x50, 0x4B, 0x03, 0x04]) || batDauBang(buffer, [0x50, 0x4B, 0x05, 0x06]) || batDauBang(buffer, [0x50, 0x4B, 0x07, 0x08])) { return DINH_DANG.ZIP; }
    if (batDauBang(buffer, [0x1F, 0x8B])) { return DINH_DANG.GZIP; }
    if (batDauBang(buffer, [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C])) { return DINH_DANG.SEVEN_ZIP; }
    if (coChuoiTai(buffer, 'BZh')) { return DINH_DANG.BZ2; }
    if (batDauBang(buffer, [0xFD, 0x37, 0x7A, 0x58, 0x5A, 0x00])) { return DINH_DANG.XZ; }
    if (buffer.length >= 262 && coChuoiTai(buffer, 'ustar', 257)) { return DINH_DANG.TAR; }
    return null;
}

function chuanHoaTenEntry(value) { return String(value || '').replaceAll('\\', '/').replace(/^\/+/, '').toLowerCase(); }

function nhanDienOfficeOpenXml(entries) {
    const ten = new Set(entries.map((item) => chuanHoaTenEntry(item.entryName)));
    if (ten.has('word/document.xml')) { return DINH_DANG.DOCX; }
    if (ten.has('xl/workbook.xml')) { return DINH_DANG.XLSX; }
    if (ten.has('ppt/presentation.xml')) { return DINH_DANG.PPTX; }
    return null;
}

function nhanDienOpenDocument(entries) {
    const entry = entries.find((item) => chuanHoaTenEntry(item.entryName) === 'mimetype');
    if (!entry) { return null; }
    const kichThuoc = Number(entry.header?.size ?? 0);
    if (!Number.isFinite(kichThuoc) || kichThuoc < 0 || kichThuoc > 1024) { return null; }
    let mime;
    try { mime = entry.getData().toString('utf8').trim(); } catch { return null; }
    if (mime === 'application/vnd.oasis.opendocument.text') { return DINH_DANG.ODT; }
    if (mime === 'application/vnd.oasis.opendocument.spreadsheet') { return DINH_DANG.ODS; }
    if (mime === 'application/vnd.oasis.opendocument.presentation') { return DINH_DANG.ODP; }
    return null;
}

function nhanDienZipContainer(buffer) {
    if (!Buffer.isBuffer(buffer) || nhanDienDinhDangNen(buffer) !== DINH_DANG.ZIP) { return null; }
    try {
        const zip = new AdmZip(buffer);
        const entries = zip.getEntries();
        const office = nhanDienOfficeOpenXml(entries);
        if (office) { return { dinhDang: office, loaiContainer: 'OFFICE_OPEN_XML', soEntry: entries.length, hopLe: true }; }
        const openDocument = nhanDienOpenDocument(entries);
        if (openDocument) { return { dinhDang: openDocument, loaiContainer: 'OPEN_DOCUMENT', soEntry: entries.length, hopLe: true }; }
        return { dinhDang: DINH_DANG.ZIP, loaiContainer: 'ZIP', soEntry: entries.length, hopLe: true };
    } catch { return { dinhDang: DINH_DANG.ZIP, loaiContainer: 'ZIP', soEntry: null, hopLe: false }; }
}

function layThongTinTepNen(buffer) {
    const dinhDangNen = nhanDienDinhDangNen(buffer);
    if (!dinhDangNen) { return { laTepNen: false, dinhDang: null, container: null, hopLe: null }; }
    if (dinhDangNen === DINH_DANG.ZIP) {
        const container = nhanDienZipContainer(buffer);
        const thongTin = container?.dinhDang ? layThongTinDinhDang(container.dinhDang) : null;
        return {
            laTepNen: thongTin?.nhom === NHOM_DINH_DANG.TEP_NEN,
            dinhDang: container?.dinhDang || DINH_DANG.ZIP,
            container,
            hopLe: container?.hopLe ?? null
        };
    }
    const thongTin = layThongTinDinhDang(dinhDangNen);
    return {
        laTepNen: thongTin?.nhom === NHOM_DINH_DANG.TEP_NEN,
        dinhDang: dinhDangNen,
        container: null,
        hopLe: true
    };
}

module.exports = {
    DINH_DANG_TEP_NEN,
    laDinhDangTepNen,
    nhanDienDinhDangNen,
    nhanDienZipContainer,
    layThongTinTepNen
};