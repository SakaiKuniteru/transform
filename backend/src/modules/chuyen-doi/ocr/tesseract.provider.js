'use strict';

const tesseract = require('../../../infrastructure/process/tesseract');
const { taoProvider } = require('./ocr-provider');

module.exports = taoProvider({
    ma: 'tesseract',
    ten: 'Tesseract OCR',
    kiemTra: (options = {}) => tesseract.kiemTra(options),
    nhanDang: async (input = {}) => tesseract.nhanDangBuffer(input.buffer, {
        dinhDangNguon: input.dinhDangNguon,
        ngonNgu: input.ngonNgu,
        psm: input.psm,
        oem: input.oem,
        preserveInterwordSpaces: input.preserveInterwordSpaces,
        signal: input.signal,
        timeoutMs: input.timeoutMs,
        maxBufferBytes: input.maxBufferBytes
    })
});