'use strict';

const { PDFDocument } = require('pdf-lib');
const parser = require('./pdf.parser');

function chuanHoaTrang(value, ten, soTrang) {
    const trang = Number(value);
    if (!Number.isSafeInteger(trang) || trang < 1 || trang > soTrang) { throw new TypeError(`${ten} phải nằm trong khoảng 1-${soTrang}.`); }
    return trang;
}

async function tachKhoang(buffer, options = {}) {
    const input = await parser.moPdf(buffer);
    const soTrang = input.getPageCount();
    const trangTu = chuanHoaTrang(options.trangTu || 1, 'Trang bắt đầu', soTrang);
    const trangDen = chuanHoaTrang(options.trangDen || trangTu, 'Trang kết thúc', soTrang);
    if (trangTu > trangDen) { throw new TypeError('Trang bắt đầu không được lớn hơn trang kết thúc.'); }
    const output = await PDFDocument.create({ updateMetadata: false });
    const indices = Array.from({ length: trangDen - trangTu + 1 }, (_, index) => trangTu - 1 + index);
    const pages = await output.copyPages(input, indices);
    for (const page of pages) { output.addPage(page); }
    const ketQua = Buffer.from(await output.save({ useObjectStreams: options.useObjectStreams !== false }));
    return { buffer: ketQua, dinhDang: 'pdf', mimeType: 'application/pdf', kichThuocBytes: ketQua.length, metadata: { tongSoTrangNguon: soTrang, trangTu, trangDen, soTrang: pages.length } };
}

async function tachTungTrang(buffer, options = {}) {
    const input = await parser.moPdf(buffer);
    const soTrang = input.getPageCount();
    const trangTu = chuanHoaTrang(options.trangTu || 1, 'Trang bắt đầu', soTrang);
    const trangDen = chuanHoaTrang(options.trangDen || soTrang, 'Trang kết thúc', soTrang);
    if (trangTu > trangDen) { throw new TypeError('Trang bắt đầu không được lớn hơn trang kết thúc.'); }
    const danhSach = [];
    for (let trang = trangTu; trang <= trangDen; trang += 1) {
        const output = await PDFDocument.create({ updateMetadata: false });
        const [page] = await output.copyPages(input, [trang - 1]);
        output.addPage(page);
        const ketQua = Buffer.from(await output.save({ useObjectStreams: options.useObjectStreams !== false }));
        danhSach.push({ trang, buffer: ketQua, dinhDang: 'pdf', mimeType: 'application/pdf', kichThuocBytes: ketQua.length });
    }
    return { danhSach, tongSoTrangNguon: soTrang, trangTu, trangDen };
}

module.exports = {
    tachKhoang,
    tachTungTrang
};