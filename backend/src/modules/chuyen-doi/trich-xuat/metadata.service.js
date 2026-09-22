'use strict';

const crypto = require('node:crypto');
const sharp = require('sharp');
const { NHOM_DINH_DANG, layThongTinDinhDang } = require('../../../constants/dinh-dang-tep');
const dinhDangService = require('../nhan-dien/dinh-dang.service');
const encodingService = require('../nhan-dien/encoding.service');
const pdfParser = require('../tai-lieu/pdf/pdf.parser');
const wordParser = require('../tai-lieu/word/word.parser');
const excelParser = require('../tai-lieu/excel/excel.parser');
const powerpointParser = require('../tai-lieu/powerpoint/powerpoint.parser');
const jsonParser = require('../du-lieu/json/json.parser');

async function layMetadataTheoDinhDang(buffer, dinhDang, options = {}) {
    if (dinhDang === 'pdf') { return pdfParser.layMetadata(buffer); }
    if (['doc', 'docx', 'odt'].includes(dinhDang)) { return wordParser.layMetadata(buffer, dinhDang); }
    if (['xls', 'xlsx', 'ods'].includes(dinhDang)) { return excelParser.layMetadata(buffer, dinhDang); }
    if (['ppt', 'pptx', 'odp'].includes(dinhDang)) { return powerpointParser.layMetadata(buffer, dinhDang); }
    if (dinhDang === 'json') { const parsed = jsonParser.parse(buffer, options); return { thongKeJson: parsed.thongKe }; }
    const thongTin = layThongTinDinhDang(dinhDang);
    if (thongTin?.nhom === NHOM_DINH_DANG.HINH_ANH) {
        const metadata = await sharp(buffer).metadata();
        return {
            chieuRong: metadata.width || null,
            chieuCao: metadata.height || null,
            soKenh: metadata.channels || null,
            alpha: metadata.hasAlpha === true,
            orientation: metadata.orientation || null,
            density: metadata.density || null,
            space: metadata.space || null,
            pages: metadata.pages || null
        };
    }
    if (thongTin?.binary === false) {
        const encoding = encodingService.nhanDienEncoding(buffer);
        return { encoding };
    }
    return {};
}

async function layMetadata(buffer, options = {}) {
    if (!Buffer.isBuffer(buffer)) { throw new TypeError('Dữ liệu metadata phải là Buffer.'); }
    const nhanDien = options.dinhDang ? { dinhDang: String(options.dinhDang).trim().toLowerCase(), nhom: layThongTinDinhDang(options.dinhDang)?.nhom || null, mimeType: options.mimeType || null, nguonNhanDien: 'DUOC_CHI_DINH', doTinCay: 'CAO', canhBao: [] } : dinhDangService.nhanDienTuBuffer(buffer, { tenTep: options.tenTep || '', mimeType: options.mimeType || 'application/octet-stream', coToanBoBuffer: true });
    const dinhDang = nhanDien.dinhDang;
    const chiTiet = dinhDang ? await layMetadataTheoDinhDang(buffer, dinhDang, options) : {};
    return {
        dinhDang,
        nhom: nhanDien.nhom || layThongTinDinhDang(dinhDang)?.nhom || null,
        mimeType: nhanDien.mimeType || layThongTinDinhDang(dinhDang)?.mimeTypes?.[0] || 'application/octet-stream',
        kichThuocBytes: buffer.length,
        sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
        nguonNhanDien: nhanDien.nguonNhanDien || null,
        doTinCay: nhanDien.doTinCay || null,
        canhBao: nhanDien.canhBao || [],
        chiTiet
    };
}

module.exports = {
    layMetadataTheoDinhDang,
    layMetadata
};