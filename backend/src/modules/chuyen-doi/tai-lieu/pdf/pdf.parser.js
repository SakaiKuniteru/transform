'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { PDFDocument } = require('pdf-lib');
const MA_LOI = require('../../../../constants/ma-loi');
const { taoLoiTheoStatus: taoLoi } = require('../../../../utils/loi');
const processCleanup = require('../../../../infrastructure/process/process-cleanup');
const qpdf = require('../../../../infrastructure/process/qpdf');

function batBuocBuffer(value) {
    if (!Buffer.isBuffer(value) || !value.length) { throw taoLoi(422, 'Dữ liệu PDF không hợp lệ hoặc rỗng.', MA_LOI.TEP_BI_HONG); }
    return value;
}

function coPdfSignature(buffer) {
    const data = batBuocBuffer(buffer);
    return data.subarray(0, Math.min(data.length, 1024)).includes(Buffer.from('%PDF-'));
}

function chuanHoaNgay(value) { return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString() : null; }

async function moPdf(buffer, options = {}) {
    const data = batBuocBuffer(buffer);
    if (!coPdfSignature(data)) { throw taoLoi(415, 'Tệp không có chữ ký PDF hợp lệ.', MA_LOI.TEP_DINH_DANG_KHONG_HO_TRO); }
    try {
        return await PDFDocument.load(data, {
            ignoreEncryption: options.ignoreEncryption !== false,
            throwOnInvalidObject: options.throwOnInvalidObject !== false,
            updateMetadata: false
        });
    } catch {
        throw taoLoi(422, 'Không thể đọc cấu trúc PDF.', MA_LOI.TEP_BI_HONG);
    }
}

async function layMetadata(buffer) {
    const data = batBuocBuffer(buffer);
    const pdf = await moPdf(data);
    return {
        dinhDang: 'pdf',
        mimeType: 'application/pdf',
        kichThuocBytes: data.length,
        soTrang: pdf.getPageCount(),
        tieuDe: pdf.getTitle() || null,
        tacGia: pdf.getAuthor() || null,
        chuDe: pdf.getSubject() || null,
        tuKhoa: pdf.getKeywords() || null,
        creator: pdf.getCreator() || null,
        producer: pdf.getProducer() || null,
        ngayTao: chuanHoaNgay(pdf.getCreationDate()),
        ngayCapNhat: chuanHoaNgay(pdf.getModificationDate())
    };
}

async function kiemTraCoBan(buffer) {
    try {
        const metadata = await layMetadata(buffer);
        return { hopLe: true, metadata, loi: null };
    } catch (error) { return { hopLe: false, metadata: null, loi: { maLoi: error.maLoi || error.code || null, thongBao: error.message } }; }
}

async function kiemTraNangCao(buffer, options = {}) {
    const data = batBuocBuffer(buffer);
    const thuMuc = await processCleanup.taoThuMucTam('pdf-check-');
    try {
        const duongDan = path.join(thuMuc, 'input.pdf');
        await fs.promises.writeFile(duongDan, data);
        const [metadata, ketQuaQpdf] = await Promise.all([layMetadata(data), qpdf.kiemTraPdf(duongDan, options)]);
        return { hopLe: ketQuaQpdf.hopLe, coCanhBao: ketQuaQpdf.coCanhBao, metadata, qpdf: { stdout: ketQuaQpdf.stdout, stderr: ketQuaQpdf.stderr, exitCode: ketQuaQpdf.exitCode } };
    } finally { await processCleanup.xoaDuongDanTam(thuMuc); }
}

module.exports = {
    coPdfSignature,
    moPdf,
    layMetadata,
    kiemTraCoBan,
    kiemTraNangCao
};