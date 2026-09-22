'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DINH_DANG, NHOM_DINH_DANG, layThongTinDinhDang, chuanHoaDinhDang, coDinhDang } = require('../../../constants/dinh-dang-tep');
const registry = require('../engine/converter-registry');
const mimeService = require('./mime.service');
const encodingService = require('./encoding.service');
const tepNenService = require('./tep-nen.service');

const DINH_DANG_TUONG_DUONG = Object.freeze([
    new Set([DINH_DANG.JPG, DINH_DANG.JPEG]),
    new Set([DINH_DANG.TIFF, DINH_DANG.TIF]),
    new Set([DINH_DANG.HTML, DINH_DANG.HTM]),
    new Set([DINH_DANG.YAML, DINH_DANG.YML])
]);

function laTuongDuong(left, right) {
    const a = chuanHoaDinhDang(left);
    const b = chuanHoaDinhDang(right);
    if (!a || !b) { return false; }
    if (a === b) { return true; }
    return DINH_DANG_TUONG_DUONG.some((nhom) => nhom.has(a) && nhom.has(b));
}

function laOfficeZip(value) {
    return [
        DINH_DANG.DOCX,
        DINH_DANG.XLSX,
        DINH_DANG.PPTX,
        DINH_DANG.ODT,
        DINH_DANG.ODS,
        DINH_DANG.ODP
    ].includes(chuanHoaDinhDang(value));
}

function laNhiPhanTheoSignature(signature) {
    if (!signature) { return false; }
    return !['RTF'].includes(signature.signature);
}

function nhanDienNoiDungVanBan(buffer) {
    const encoding = encodingService.nhanDienEncoding(buffer);
    if (!encoding.laVanBan || !encoding.encoding || ['utf32le', 'utf32be'].includes(encoding.encoding)) { return { dinhDang: null, encoding }; }
    let text;
    try { text = encodingService.docVanBan(buffer, encoding.encoding).trimStart(); } catch { return { dinhDang: null, encoding }; }
    const mau = text.slice(0, 65536);
    if (/^<\?xml[\s\S]*?<svg[\s>]/i.test(mau) || /^<svg[\s>]/i.test(mau)) { return { dinhDang: DINH_DANG.SVG, encoding }; }
    if (/^(<!doctype\s+html\b|<html[\s>])/i.test(mau)) { return { dinhDang: DINH_DANG.HTML, encoding }; }
    if (/^<\?xml[\s>]/i.test(mau)) { return { dinhDang: DINH_DANG.XML, encoding }; }
    if (/^[\[{]/.test(mau)) {
        try {
            JSON.parse(mau);
            return { dinhDang: DINH_DANG.JSON, encoding };
        } catch {}
    }
    if (/^---(?:\r?\n|$)/.test(mau) && /^[\s\S]*^[A-Za-z0-9_.-]+\s*:/m.test(mau)) { return { dinhDang: DINH_DANG.YAML, encoding }; }
    return { dinhDang: DINH_DANG.TXT, encoding };
}

function layLoaiChuyenDoiHoTro(dinhDang) {
    const format = chuanHoaDinhDang(dinhDang);
    if (!format) { return []; }
    const ketQua = new Set();
    for (const converter of registry.layDanhSachConverter()) {
        if (!converter.dinhDangNguon.includes('*') && !converter.dinhDangNguon.includes(format)) { continue; }
        for (const loai of converter.loaiChuyenDoi) { ketQua.add(loai); }
    }
    return [...ketQua].sort();
}

function layDinhDangDichHoTro(dinhDang, loaiChuyenDoi = null) {
    const format = chuanHoaDinhDang(dinhDang);
    if (!format) { return []; }
    const loai = loaiChuyenDoi ? String(loaiChuyenDoi).trim().toUpperCase() : null;
    const ketQua = new Set();
    for (const converter of registry.layDanhSachConverter()) {
        if (!converter.dinhDangNguon.includes('*') && !converter.dinhDangNguon.includes(format)) { continue; }
        if (loai && !converter.loaiChuyenDoi.includes(loai)) { continue; }
        for (const dich of converter.dinhDangDich) { if (dich !== '*') { ketQua.add(dich); } }
    }
    return [...ketQua].sort();
}

function chonDinhDang({ dinhDangPhanMoRong, dinhDangMime, signature, container, noiDung, coToanBoBuffer }) {
    if (container?.dinhDang && container.dinhDang !== DINH_DANG.ZIP) { return { dinhDang: container.dinhDang, nguonNhanDien: 'CONTAINER', doTinCay: 'CAO' }; }
    if (signature?.dinhDang && signature.dinhDang !== DINH_DANG.ZIP) { return { dinhDang: signature.dinhDang, nguonNhanDien: 'SIGNATURE', doTinCay: signature.doTinCay || 'CAO' }; }
    if (signature?.signature === 'OLE' && dinhDangPhanMoRong && [DINH_DANG.DOC, DINH_DANG.XLS, DINH_DANG.PPT].includes(dinhDangPhanMoRong)) { return { dinhDang: dinhDangPhanMoRong, nguonNhanDien: 'PHAN_MO_RONG_OLE', doTinCay: 'CAO' }; }
    if (signature?.dinhDang === DINH_DANG.ZIP) {
        if (coToanBoBuffer && container?.dinhDang === DINH_DANG.ZIP) { return { dinhDang: DINH_DANG.ZIP, nguonNhanDien: 'SIGNATURE', doTinCay: container.hopLe === false ? 'TRUNG_BINH' : 'CAO' }; }
        if (!coToanBoBuffer && laOfficeZip(dinhDangPhanMoRong)) { return { dinhDang: dinhDangPhanMoRong, nguonNhanDien: 'PHAN_MO_RONG_ZIP', doTinCay: 'TRUNG_BINH' }; }
        return { dinhDang: DINH_DANG.ZIP, nguonNhanDien: 'SIGNATURE', doTinCay: 'CAO' };
    }
    if (noiDung?.dinhDang && dinhDangPhanMoRong && laTuongDuong(noiDung.dinhDang, dinhDangPhanMoRong)) { return { dinhDang: dinhDangPhanMoRong, nguonNhanDien: 'PHAN_MO_RONG_NOI_DUNG', doTinCay: 'CAO' }; }
    if (dinhDangPhanMoRong && dinhDangMime && laTuongDuong(dinhDangPhanMoRong, dinhDangMime)) { return { dinhDang: dinhDangPhanMoRong, nguonNhanDien: 'PHAN_MO_RONG_MIME', doTinCay: 'CAO' }; }
    if (dinhDangPhanMoRong) { return { dinhDang: dinhDangPhanMoRong, nguonNhanDien: 'PHAN_MO_RONG', doTinCay: 'TRUNG_BINH' }; }
    if (dinhDangMime) { return { dinhDang: dinhDangMime, nguonNhanDien: 'MIME', doTinCay: 'TRUNG_BINH' }; }
    if (noiDung?.dinhDang) { return { dinhDang: noiDung.dinhDang, nguonNhanDien: 'NOI_DUNG', doTinCay: 'THAP' }; }
    return { dinhDang: null, nguonNhanDien: 'KHONG_XAC_DINH', doTinCay: 'THAP' };
}

function taoCanhBao({ dinhDangPhanMoRong, dinhDangMime, signature, container, noiDung, coToanBoBuffer }) {
    const canhBao = [];
    if (dinhDangPhanMoRong && dinhDangMime && !laTuongDuong(dinhDangPhanMoRong, dinhDangMime)) { canhBao.push('Phần mở rộng và MIME không khớp nhau.'); }
    if (signature?.dinhDang && signature.dinhDang !== DINH_DANG.ZIP && dinhDangPhanMoRong && !laTuongDuong(signature.dinhDang, dinhDangPhanMoRong)) { canhBao.push('Signature tệp không khớp phần mở rộng.'); }
    if (noiDung?.dinhDang && dinhDangPhanMoRong && !laTuongDuong(noiDung.dinhDang, dinhDangPhanMoRong) && !signature) { canhBao.push('Nội dung văn bản không khớp phần mở rộng.'); }
    if (signature?.dinhDang === DINH_DANG.ZIP && coToanBoBuffer && container?.dinhDang === DINH_DANG.ZIP && laOfficeZip(dinhDangPhanMoRong)) { canhBao.push('Tệp có phần mở rộng Office/OpenDocument nhưng cấu trúc ZIP không xác nhận đúng loại tài liệu.'); }
    if (signature?.dinhDang === DINH_DANG.ZIP && !coToanBoBuffer && laOfficeZip(dinhDangPhanMoRong)) { canhBao.push('Chưa xác minh cấu trúc ZIP đầy đủ vì mới đọc mẫu đầu tệp.'); }
    if (container?.hopLe === false) { canhBao.push('Container ZIP không thể được phân tích đầy đủ.'); }
    return canhBao;
}

function taoKetQuaNhanDien({ buffer, tenTep = '', mimeType = mimeService.MIME_MAC_DINH, coToanBoBuffer = true }) {
    if (!Buffer.isBuffer(buffer)) { throw new TypeError('Dữ liệu nhận diện định dạng phải là Buffer.'); }
    const mime = mimeService.chuanHoaMime(mimeType);
    const dinhDangPhanMoRong = mimeService.layDinhDangTheoPhanMoRong(tenTep);
    const dinhDangMime = mimeService.layDinhDangTheoMime(mime, dinhDangPhanMoRong);
    const signature = mimeService.nhanDienSignature(buffer);
    const container = signature?.dinhDang === DINH_DANG.ZIP && coToanBoBuffer ? tepNenService.nhanDienZipContainer(buffer) : null;
    const noiDung = !signature || signature.signature === 'OLE' || !laNhiPhanTheoSignature(signature) ? nhanDienNoiDungVanBan(buffer) : null;
    const chon = chonDinhDang({ dinhDangPhanMoRong, dinhDangMime, signature, container, noiDung, coToanBoBuffer });
    const thongTin = chon.dinhDang ? layThongTinDinhDang(chon.dinhDang) : null;
    const mimeChuan = thongTin ? mimeService.layMimeChinhTheoDinhDang(chon.dinhDang) : mime;
    const canhBao = taoCanhBao({ dinhDangPhanMoRong, dinhDangMime, signature, container, noiDung, coToanBoBuffer });
    return {
        dinhDang: chon.dinhDang,
        mimeType: mimeChuan,
        nhom: thongTin?.nhom || NHOM_DINH_DANG.KHAC,
        tenDinhDang: thongTin?.ten || null,
        binary: thongTin?.binary ?? !(noiDung?.encoding?.laVanBan === true),
        preview: thongTin?.preview ?? false,
        encoding: noiDung?.encoding || null,
        laTepNen: thongTin?.nhom === NHOM_DINH_DANG.TEP_NEN,
        nguonNhanDien: chon.nguonNhanDien,
        doTinCay: chon.doTinCay,
        canhBao,
        doiChieu: {
            phanMoRong: dinhDangPhanMoRong,
            mime: dinhDangMime,
            signature: signature?.dinhDang || null,
            loaiSignature: signature?.signature || null,
            container: container?.dinhDang || null,
            noiDung: noiDung?.dinhDang || null
        },
        loaiChuyenDoiHoTro: layLoaiChuyenDoiHoTro(chon.dinhDang),
        dinhDangDichHoTro: layDinhDangDichHoTro(chon.dinhDang)
    };
}

function nhanDienTuBuffer(buffer, options = {}) {
    return taoKetQuaNhanDien({
        buffer,
        tenTep: options.tenTep || '',
        mimeType: options.mimeType || options.mime || mimeService.MIME_MAC_DINH,
        coToanBoBuffer: options.coToanBoBuffer !== false
    });
}

async function docDauTep(duongDan, soByte = 65536) {
    if (!Number.isSafeInteger(soByte) || soByte <= 0) { throw new TypeError('Số byte mẫu phải là số nguyên dương.'); }
    const handle = await fs.promises.open(duongDan, 'r');
    try {
        const stat = await handle.stat();
        const kichThuoc = Math.min(stat.size, soByte);
        const buffer = Buffer.alloc(kichThuoc);
        if (kichThuoc > 0) { await handle.read(buffer, 0, kichThuoc, 0); }
        return { buffer, stat };
    } finally { await handle.close(); }
}

async function nhanDienTuDuongDan(duongDan, options = {}) {
    if (typeof duongDan !== 'string' || !duongDan.trim()) { throw new TypeError('Đường dẫn tệp không hợp lệ.'); }
    const absolute = path.resolve(duongDan);
    const { buffer, stat } = await docDauTep(absolute, options.soByteMau || 65536);
    const ketQua = taoKetQuaNhanDien({
        buffer,
        tenTep: options.tenTep || path.basename(absolute),
        mimeType: options.mimeType || options.mime || mimeService.layMimeTheoPhanMoRong(absolute),
        coToanBoBuffer: stat.size <= buffer.length
    });
    return {
        ...ketQua,
        kichThuocBytes: stat.size,
        duongDan: absolute
    };
}

function laDinhDangHoTro(value) { return coDinhDang(value); }

module.exports = {
    laTuongDuong,
    laDinhDangHoTro,
    nhanDienNoiDungVanBan,
    layLoaiChuyenDoiHoTro,
    layDinhDangDichHoTro,
    nhanDienTuBuffer,
    nhanDienTuDuongDan
};