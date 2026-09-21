'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DINH_DANG } = require('../../../../constants/dinh-dang-tep');
const processCleanup = require('../../../../infrastructure/process/process-cleanup');
const libreoffice = require('../../../../infrastructure/process/libreoffice');
const pandoc = require('../../../../infrastructure/process/pandoc');
const parser = require('./word.parser');

function chuanHoaDinhDangNguon(value) { const dinhDang = String(value || '').trim().toLowerCase(); if (!parser.DINH_DANG_WORD.includes(dinhDang)) { throw new TypeError('Định dạng Word nguồn chỉ hỗ trợ DOC, DOCX hoặc ODT.'); } return dinhDang; }

function chuanHoaDinhDangVanBan(value) { const dinhDang = String(value || '').trim().toLowerCase(); if (![DINH_DANG.HTML, DINH_DANG.HTM, DINH_DANG.TXT, DINH_DANG.MARKDOWN].includes(dinhDang)) { throw new TypeError('Định dạng văn bản đích chỉ hỗ trợ HTML, TXT hoặc Markdown.'); } return dinhDang; }

function layMimeType(dinhDang) { if (dinhDang === DINH_DANG.PDF) { return 'application/pdf'; } if ([DINH_DANG.HTML, DINH_DANG.HTM].includes(dinhDang)) { return 'text/html; charset=utf-8'; } if (dinhDang === DINH_DANG.MARKDOWN) { return 'text/markdown; charset=utf-8'; } if (dinhDang === DINH_DANG.TXT) { return 'text/plain; charset=utf-8'; } return 'application/octet-stream'; }

function layExtension(dinhDang) { return dinhDang === DINH_DANG.HTM ? 'htm' : dinhDang; }

async function ghiNguon(thuMuc, buffer, dinhDangNguon) { const input = path.join(thuMuc, `input.${dinhDangNguon}`); await fs.promises.writeFile(input, buffer); return input; }

async function chuyenSangPdf(buffer, dinhDangNguon, options = {}) {
    const nguon = chuanHoaDinhDangNguon(dinhDangNguon);
    await parser.layMetadata(buffer, nguon);
    const thuMuc = await processCleanup.taoThuMucTam('word-pdf-');
    try {
        const input = await ghiNguon(thuMuc, buffer, nguon);
        const processResult = await libreoffice.chuyenDoi(input, thuMuc, DINH_DANG.PDF, options);
        const output = await fs.promises.readFile(processResult.duongDanDich);
        return {
            buffer: output,
            dinhDang: DINH_DANG.PDF,
            mimeType: layMimeType(DINH_DANG.PDF),
            kichThuocBytes: output.length,
            metadata: { dinhDangNguon: nguon },
            thongKe: { thoiGianMs: processResult.durationMs, congCu: 'libreoffice' }
        };
    } finally { await processCleanup.xoaDuongDanTam(thuMuc); }
}

async function chuanBiNguonPandoc(thuMuc, buffer, dinhDangNguon, options = {}) {
    const nguon = chuanHoaDinhDangNguon(dinhDangNguon);
    const input = await ghiNguon(thuMuc, buffer, nguon);
    if (nguon !== DINH_DANG.DOC) { return { duongDan: input, dinhDang: nguon, thoiGianLibreOfficeMs: 0 }; }
    const ketQua = await libreoffice.chuyenDoi(input, thuMuc, DINH_DANG.DOCX, options);
    return { duongDan: ketQua.duongDanDich, dinhDang: DINH_DANG.DOCX, thoiGianLibreOfficeMs: ketQua.durationMs };
}

async function chuyenSangVanBan(buffer, dinhDangNguon, dinhDangDich, options = {}) {
    const nguon = chuanHoaDinhDangNguon(dinhDangNguon);
    const dich = chuanHoaDinhDangVanBan(dinhDangDich);
    await parser.layMetadata(buffer, nguon);
    const thuMuc = await processCleanup.taoThuMucTam('word-text-');
    try {
        const input = await chuanBiNguonPandoc(thuMuc, buffer, nguon, options);
        const outputPath = path.join(thuMuc, `output.${layExtension(dich)}`);
        const processResult = await pandoc.chuyenDoi(input.duongDan, outputPath, { ...options, from: input.dinhDang, to: dich });
        const output = await fs.promises.readFile(outputPath);
        return {
            buffer: output,
            dinhDang: dich,
            mimeType: layMimeType(dich),
            kichThuocBytes: output.length,
            metadata: { dinhDangNguon: nguon },
            thongKe: { thoiGianMs: input.thoiGianLibreOfficeMs + processResult.durationMs, congCu: nguon === DINH_DANG.DOC ? 'libreoffice+pandoc' : 'pandoc' }
        };
    } finally { await processCleanup.xoaDuongDanTam(thuMuc); }
}

module.exports = {
    chuyenSangPdf,
    chuyenSangVanBan
};