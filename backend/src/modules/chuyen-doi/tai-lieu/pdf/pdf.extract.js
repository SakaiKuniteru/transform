'use strict';

const fs = require('node:fs');
const path = require('node:path');
const processCleanup = require('../../../../infrastructure/process/process-cleanup');
const poppler = require('../../../../infrastructure/process/poppler');
const parser = require('./pdf.parser');

async function trichXuatVanBan(buffer, options = {}) {
    await parser.moPdf(buffer);
    const thuMuc = await processCleanup.taoThuMucTam('pdf-text-');
    try {
        const input = path.join(thuMuc, 'input.pdf');
        const output = path.join(thuMuc, 'output.txt');
        await fs.promises.writeFile(input, buffer);
        const processResult = await poppler.trichXuatVanBan(input, output, options);
        const textBuffer = await fs.promises.readFile(output);
        const text = textBuffer.toString(options.nodeEncoding || 'utf8');
        return {
            text,
            buffer: textBuffer,
            dinhDang: 'txt',
            mimeType: 'text/plain; charset=utf-8',
            kichThuocBytes: textBuffer.length,
            thongKe: {
                soKyTu: text.length,
                soDong: text ? text.split(/\r?\n/).length : 0,
                thoiGianMs: processResult.durationMs
            }
        };
    } finally { await processCleanup.xoaDuongDanTam(thuMuc); }
}

module.exports = {
    trichXuatVanBan
};