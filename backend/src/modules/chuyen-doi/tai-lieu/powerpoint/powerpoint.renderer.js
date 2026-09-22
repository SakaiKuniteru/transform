'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DINH_DANG } = require('../../../../constants/dinh-dang-tep');
const processCleanup = require('../../../../infrastructure/process/process-cleanup');
const libreoffice = require('../../../../infrastructure/process/libreoffice');
const pdfRenderer = require('../pdf/pdf.renderer');
const parser = require('./powerpoint.parser');

function chuanHoaDinhDangNguon(value) { const dinhDang = String(value || '').trim().toLowerCase(); if (!parser.DINH_DANG_POWERPOINT.includes(dinhDang)) { throw new TypeError('Định dạng PowerPoint chỉ hỗ trợ PPT, PPTX hoặc ODP.'); } return dinhDang; }

function chuanHoaDinhDangAnh(value) { const dinhDang = String(value || '').trim().toLowerCase(); if (![DINH_DANG.PNG, DINH_DANG.JPG, DINH_DANG.JPEG].includes(dinhDang)) { throw new TypeError('PowerPoint preview chỉ hỗ trợ PNG hoặc JPEG.'); } return dinhDang; }

async function chuyenSangPdf(buffer, dinhDangNguon, options = {}) {
    const dinhDang = chuanHoaDinhDangNguon(dinhDangNguon);
    const metadataNguon = await parser.layMetadata(buffer, dinhDang);
    const thuMuc = await processCleanup.taoThuMucTam('powerpoint-pdf-');
    try {
        const input = path.join(thuMuc, `input.${dinhDang}`);
        await fs.promises.writeFile(input, buffer);
        const result = await libreoffice.chuyenDoi(input, thuMuc, DINH_DANG.PDF, options);
        const output = await fs.promises.readFile(result.duongDanDich);
        return { buffer: output, dinhDang: DINH_DANG.PDF, mimeType: 'application/pdf', kichThuocBytes: output.length, metadata: { dinhDangNguon: dinhDang, soSlide: metadataNguon.soSlide ?? null }, thongKe: { thoiGianMs: result.durationMs, congCu: 'libreoffice' } };
    } finally { await processCleanup.xoaDuongDanTam(thuMuc); }
}

async function renderSlide(buffer, dinhDangNguon, dinhDangDich, options = {}) {
    const dich = chuanHoaDinhDangAnh(dinhDangDich);
    const metadataNguon = await parser.layMetadata(buffer, chuanHoaDinhDangNguon(dinhDangNguon));
    const slide = Number(options.slide || options.trang || 1);
    if (!Number.isSafeInteger(slide) || slide < 1 || metadataNguon.soSlide && slide > metadataNguon.soSlide) { throw new TypeError(`Slide phải nằm trong khoảng 1-${metadataNguon.soSlide || '?'}.`); }
    const pdf = await chuyenSangPdf(buffer, dinhDangNguon, options);
    const render = await pdfRenderer.renderTrang(pdf.buffer, { ...options, trang: slide, dinhDang: dich === DINH_DANG.JPG ? DINH_DANG.JPEG : dich });
    return {
        buffer: render.buffer,
        dinhDang: dich,
        mimeType: dich === DINH_DANG.PNG ? 'image/png' : 'image/jpeg',
        kichThuocBytes: render.buffer.length,
        metadata: { slide, tongSoSlide: metadataNguon.soSlide ?? render.metadata?.tongSoTrang ?? null, chieuRong: render.metadata?.chieuRong ?? null, chieuCao: render.metadata?.chieuCao ?? null, dpi: render.metadata?.dpi ?? null },
        thongKe: { thoiGianLibreOfficeMs: pdf.thongKe.thoiGianMs, thoiGianRenderMs: render.thongKe?.thoiGianMs || 0, congCu: 'libreoffice+pdftoppm' }
    };
}

module.exports = {
    chuyenSangPdf,
    renderSlide
};