'use strict';

const { PDFDocument } = require('pdf-lib');
const parser = require('./pdf.parser');

async function gop(danhSachBuffer, options = {}) {
    if (!Array.isArray(danhSachBuffer) || danhSachBuffer.length < 2) { throw new TypeError('Gộp PDF cần ít nhất 2 Buffer nguồn.'); }
    const output = await PDFDocument.create({ updateMetadata: false });
    let tongSoTrang = 0;
    for (const buffer of danhSachBuffer) {
        const input = await parser.moPdf(buffer);
        const pageIndices = input.getPageIndices();
        const pages = await output.copyPages(input, pageIndices);
        for (const page of pages) { output.addPage(page); }
        tongSoTrang += pages.length;
    }
    if (options.tieuDe) { output.setTitle(String(options.tieuDe), { showInWindowTitleBar: false }); }
    if (options.tacGia) { output.setAuthor(String(options.tacGia)); }
    const buffer = Buffer.from(await output.save({ useObjectStreams: options.useObjectStreams !== false }));
    return { buffer, dinhDang: 'pdf', mimeType: 'application/pdf', kichThuocBytes: buffer.length, metadata: { soTepNguon: danhSachBuffer.length, soTrang: tongSoTrang } };
}

module.exports = {
    gop
};