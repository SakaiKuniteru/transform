'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DINH_DANG } = require('../../../../constants/dinh-dang-tep');
const processCleanup = require('../../../../infrastructure/process/process-cleanup');
const libreoffice = require('../../../../infrastructure/process/libreoffice');
const parser = require('./excel.parser');

function chuanHoaDinhDangNguon(value) { const dinhDang = String(value || '').trim().toLowerCase(); if (!parser.DINH_DANG_EXCEL.includes(dinhDang)) { throw new TypeError('Định dạng bảng tính chỉ hỗ trợ XLS, XLSX hoặc ODS.'); } return dinhDang; }

function chonSheet(workbook, options = {}) {
    if (!workbook?.sheets?.length) { throw new Error('Bảng tính không có sheet dữ liệu.'); }
    if (options.tenSheet) {
        const ten = String(options.tenSheet).trim().toLowerCase();
        const sheet = workbook.sheets.find((item) => String(item.ten).trim().toLowerCase() === ten);
        if (!sheet) { throw new TypeError(`Không tìm thấy sheet "${options.tenSheet}".`); }
        return sheet;
    }
    const index = options.sheetIndex === undefined || options.sheetIndex === null ? 1 : Number(options.sheetIndex);
    if (!Number.isSafeInteger(index) || index < 1 || index > workbook.sheets.length) { throw new TypeError(`sheetIndex phải nằm trong khoảng 1-${workbook.sheets.length}.`); }
    return workbook.sheets[index - 1];
}

function escapeCsv(value, delimiter) { if (value === null || value === undefined) { return ''; } const text = typeof value === 'object' ? JSON.stringify(value) : String(value); return /["\r\n]/.test(text) || text.includes(delimiter) ? `"${text.replaceAll('"', '""')}"` : text; }

function taoCsv(rows, options = {}) {
    const delimiter = options.delimiter === undefined ? ',' : String(options.delimiter);
    if (!delimiter || /[\r\n"]/.test(delimiter) || delimiter.length > 1) { throw new TypeError('CSV delimiter phải là một ký tự hợp lệ.'); }
    const lineEnding = options.lineEnding === 'CRLF' ? '\r\n' : '\n';
    const text = rows.map((row) => row.map((value) => escapeCsv(value, delimiter)).join(delimiter)).join(lineEnding);
    return `${options.bom === true ? '\uFEFF' : ''}${text}${text && options.dongCuoi !== false ? lineEnding : ''}`;
}

function taoTenCot(headers) {
    const daDung = new Map();
    return headers.map((item, index) => {
        const base = String(item ?? '').trim() || `cot_${index + 1}`;
        const soLan = (daDung.get(base) || 0) + 1;
        daDung.set(base, soLan);
        return soLan === 1 ? base : `${base}_${soLan}`;
    });
}

function taoBanGhi(rows, options = {}) {
    if (options.coHeader === false) { return rows; }
    if (!rows.length) { return []; }
    const headers = taoTenCot(rows[0]);
    return rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? null])));
}

async function chuanBiWorkbook(buffer, dinhDangNguon, options = {}) {
    const dinhDang = chuanHoaDinhDangNguon(dinhDangNguon);
    await parser.layMetadata(buffer, dinhDang);
    if (dinhDang !== DINH_DANG.XLS) { return { buffer, dinhDang, thoiGianLibreOfficeMs: 0 }; }
    const thuMuc = await processCleanup.taoThuMucTam('excel-xlsx-');
    try {
        const input = path.join(thuMuc, 'input.xls');
        await fs.promises.writeFile(input, buffer);
        const result = await libreoffice.chuyenDoi(input, thuMuc, DINH_DANG.XLSX, options);
        return { buffer: await fs.promises.readFile(result.duongDanDich), dinhDang: DINH_DANG.XLSX, thoiGianLibreOfficeMs: result.durationMs };
    } finally { await processCleanup.xoaDuongDanTam(thuMuc); }
}

async function chuyenSangCsv(buffer, dinhDangNguon, options = {}) {
    const workbook = await chuanBiWorkbook(buffer, dinhDangNguon, options);
    const data = await parser.docBangTinh(workbook.buffer, workbook.dinhDang, options);
    const sheet = chonSheet(data, options);
    const text = taoCsv(sheet.rows, options);
    const output = Buffer.from(text, 'utf8');
    return { buffer: output, dinhDang: DINH_DANG.CSV, mimeType: 'text/csv; charset=utf-8', kichThuocBytes: output.length, metadata: { tenSheet: sheet.ten, sheetIndex: sheet.thuTu, soDong: sheet.rows.length, soSheet: data.sheets.length }, thongKe: { thoiGianLibreOfficeMs: workbook.thoiGianLibreOfficeMs } };
}

async function chuyenSangJson(buffer, dinhDangNguon, options = {}) {
    const workbook = await chuanBiWorkbook(buffer, dinhDangNguon, options);
    const data = await parser.docBangTinh(workbook.buffer, workbook.dinhDang, options);
    let payload;
    if (options.tenSheet || options.sheetIndex) {
        const sheet = chonSheet(data, options);
        payload = { tenSheet: sheet.ten, sheetIndex: sheet.thuTu, duLieu: taoBanGhi(sheet.rows, options) };
    } else {
        payload = { sheets: data.sheets.map((sheet) => ({ tenSheet: sheet.ten, sheetIndex: sheet.thuTu, duLieu: taoBanGhi(sheet.rows, options) })) };
    }
    const text = JSON.stringify(payload, null, options.pretty === false ? 0 : 2);
    const output = Buffer.from(text, 'utf8');
    return { buffer: output, dinhDang: DINH_DANG.JSON, mimeType: 'application/json; charset=utf-8', kichThuocBytes: output.length, metadata: { soSheet: data.sheets.length }, thongKe: { thoiGianLibreOfficeMs: workbook.thoiGianLibreOfficeMs } };
}

async function chuyenSangPdf(buffer, dinhDangNguon, options = {}) {
    const dinhDang = chuanHoaDinhDangNguon(dinhDangNguon);
    await parser.layMetadata(buffer, dinhDang);
    const thuMuc = await processCleanup.taoThuMucTam('excel-pdf-');
    try {
        const input = path.join(thuMuc, `input.${dinhDang}`);
        await fs.promises.writeFile(input, buffer);
        const result = await libreoffice.chuyenDoi(input, thuMuc, DINH_DANG.PDF, options);
        const output = await fs.promises.readFile(result.duongDanDich);
        return { buffer: output, dinhDang: DINH_DANG.PDF, mimeType: 'application/pdf', kichThuocBytes: output.length, metadata: { dinhDangNguon: dinhDang }, thongKe: { thoiGianMs: result.durationMs, congCu: 'libreoffice' } };
    } finally { await processCleanup.xoaDuongDanTam(thuMuc); }
}

module.exports = {
    chuanBiWorkbook,
    chuyenSangCsv,
    chuyenSangJson,
    chuyenSangPdf
};