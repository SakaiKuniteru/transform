'use strict';

const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const processCleanup = require('../../../../infrastructure/process/process-cleanup');
const poppler = require('../../../../infrastructure/process/poppler');
const parser = require('./pdf.parser');

function chuanHoaDinhDangAnh(value) {
    const dinhDang = String(value || '').trim().toLowerCase();
    if (!['png', 'jpg', 'jpeg'].includes(dinhDang)) { throw new TypeError('Định dạng render PDF chỉ hỗ trợ png, jpg hoặc jpeg.'); }
    return dinhDang;
}

function chuanHoaDinhDangNguonAnh(value) {
    const dinhDang = String(value || '').trim().toLowerCase();
    if (!['png', 'jpg', 'jpeg', 'webp'].includes(dinhDang)) { throw new TypeError('Ảnh nguồn tạo PDF chỉ hỗ trợ PNG, JPEG hoặc WebP.'); }
    return dinhDang;
}

async function renderTrang(buffer, options = {}) {
    const metadataPdf = await parser.layMetadata(buffer);
    const trang = Number(options.trang || 1);
    if (!Number.isSafeInteger(trang) || trang < 1 || trang > metadataPdf.soTrang) { throw new TypeError(`Trang render phải nằm trong khoảng 1-${metadataPdf.soTrang}.`); }
    const dinhDang = chuanHoaDinhDangAnh(options.dinhDang || 'png');
    const thuMuc = await processCleanup.taoThuMucTam('pdf-render-');
    try {
        const input = path.join(thuMuc, 'input.pdf');
        const prefix = path.join(thuMuc, 'page');
        await fs.promises.writeFile(input, buffer);
        const processResult = await poppler.renderAnh(input, prefix, { ...options, dinhDang, trangTu: trang, trangDen: trang, singleFile: true });
        const duongDanAnh = processResult.danhSachTep[0];
        const output = await fs.promises.readFile(duongDanAnh);
        const metadataAnh = await sharp(output).metadata();
        return {
            buffer: output,
            dinhDang,
            mimeType: dinhDang === 'png' ? 'image/png' : 'image/jpeg',
            kichThuocBytes: output.length,
            metadata: {
                trang,
                tongSoTrang: metadataPdf.soTrang,
                chieuRong: metadataAnh.width || null,
                chieuCao: metadataAnh.height || null,
                dpi: processResult.dpi
            },
            thongKe: { thoiGianMs: processResult.durationMs }
        };
    } finally { await processCleanup.xoaDuongDanTam(thuMuc); }
}

async function renderNhieuTrang(buffer, options = {}) {
    const metadataPdf = await parser.layMetadata(buffer);
    const trangTu = Number(options.trangTu || 1);
    const trangDen = Number(options.trangDen || metadataPdf.soTrang);
    if (!Number.isSafeInteger(trangTu) || !Number.isSafeInteger(trangDen) || trangTu < 1 || trangDen > metadataPdf.soTrang || trangTu > trangDen) { throw new TypeError(`Khoảng trang render phải nằm trong 1-${metadataPdf.soTrang}.`); }
    const dinhDang = chuanHoaDinhDangAnh(options.dinhDang || 'png');
    const thuMuc = await processCleanup.taoThuMucTam('pdf-pages-');
    try {
        const input = path.join(thuMuc, 'input.pdf');
        const prefix = path.join(thuMuc, 'page');
        await fs.promises.writeFile(input, buffer);
        const processResult = await poppler.renderAnh(input, prefix, { ...options, dinhDang, trangTu, trangDen, singleFile: false });
        const danhSach = [];
        for (let index = 0; index < processResult.danhSachTep.length; index += 1) {
            const output = await fs.promises.readFile(processResult.danhSachTep[index]);
            const metadataAnh = await sharp(output).metadata();
            danhSach.push({ trang: trangTu + index, buffer: output, dinhDang, mimeType: dinhDang === 'png' ? 'image/png' : 'image/jpeg', kichThuocBytes: output.length, chieuRong: metadataAnh.width || null, chieuCao: metadataAnh.height || null });
        }
        return { danhSach, tongSoTrang: metadataPdf.soTrang, trangTu, trangDen, dpi: processResult.dpi };
    } finally { await processCleanup.xoaDuongDanTam(thuMuc); }
}

async function taoPdfTuAnh(buffer, dinhDangNguon, options = {}) {
    const dinhDang = chuanHoaDinhDangNguonAnh(dinhDangNguon);
    const metadataAnh = await sharp(buffer).metadata();
    if (!metadataAnh.width || !metadataAnh.height) { throw new TypeError('Không xác định được kích thước ảnh nguồn.'); }
    let imageBuffer = buffer;
    let loaiEmbed = dinhDang;
    if (dinhDang === 'webp') {
        imageBuffer = await sharp(buffer).png().toBuffer();
        loaiEmbed = 'png';
    }
    const pdf = await PDFDocument.create({ updateMetadata: false });
    const image = loaiEmbed === 'png' ? await pdf.embedPng(imageBuffer) : await pdf.embedJpg(imageBuffer);
    const dpi = Number(options.dpi || 72);
    if (!Number.isFinite(dpi) || dpi <= 0 || dpi > 1200) { throw new TypeError('DPI ảnh tạo PDF không hợp lệ.'); }
    const width = metadataAnh.width * 72 / dpi;
    const height = metadataAnh.height * 72 / dpi;
    const page = pdf.addPage([width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height });
    const output = Buffer.from(await pdf.save({ useObjectStreams: true }));
    return {
        buffer: output,
        dinhDang: 'pdf',
        mimeType: 'application/pdf',
        kichThuocBytes: output.length,
        metadata: { soTrang: 1, chieuRongAnh: metadataAnh.width, chieuCaoAnh: metadataAnh.height, dpi }
    };
}

module.exports = {
    renderTrang,
    renderNhieuTrang,
    taoPdfTuAnh
};