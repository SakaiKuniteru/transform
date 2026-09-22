'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { CONG_CU, chayCongCu, kiemTraCongCu } = require('./process-runner');
const processCleanup = require('./process-cleanup');

const NGON_NGU_MAC_DINH = 'vie+eng';
const DINH_DANG_ANH_HO_TRO = Object.freeze(['png','jpg','jpeg','webp','bmp','tiff','tif']);

function chuanHoaNgonNgu(value) { const text = String(value || NGON_NGU_MAC_DINH).trim(); if (!/^[A-Za-z0-9_+-]{2,100}$/.test(text)) { throw new TypeError('Ngôn ngữ OCR không hợp lệ.'); } return text; }
function chuanHoaDinhDang(value) { const format = String(value || 'png').trim().toLowerCase().replace(/^\./, ''); if (!DINH_DANG_ANH_HO_TRO.includes(format)) { throw new TypeError(`Tesseract chưa hỗ trợ định dạng "${value}".`); } return format; }
function chuanHoaPsm(value) { if (value === undefined || value === null || value === '') { return null; } const number = Number(value); if (!Number.isSafeInteger(number) || number < 0 || number > 13) { throw new TypeError('Tesseract PSM phải nằm trong khoảng 0..13.'); } return number; }
function chuanHoaOem(value) { if (value === undefined || value === null || value === '') { return null; } const number = Number(value); if (!Number.isSafeInteger(number) || number < 0 || number > 3) { throw new TypeError('Tesseract OEM phải nằm trong khoảng 0..3.'); } return number; }

async function kiemTra(options = {}) { return kiemTraCongCu(CONG_CU.TESSERACT, ['--version'], options); }

async function nhanDangBuffer(buffer, options = {}) {
    if (!Buffer.isBuffer(buffer) || !buffer.length) { throw new TypeError('Dữ liệu OCR phải là Buffer không rỗng.'); }
    const ngonNgu = chuanHoaNgonNgu(options.ngonNgu || options.lang);
    const dinhDang = chuanHoaDinhDang(options.dinhDang || options.dinhDangNguon);
    const psm = chuanHoaPsm(options.psm);
    const oem = chuanHoaOem(options.oem);
    const thuMuc = await processCleanup.taoThuMucTam('ocr-');
    const inputPath = path.join(thuMuc, `input.${dinhDang}`);
    try {
        await fs.promises.writeFile(inputPath, buffer, { flag: 'wx' });
        const args = [inputPath, 'stdout', '-l', ngonNgu];
        if (psm !== null) { args.push('--psm', String(psm)); }
        if (oem !== null) { args.push('--oem', String(oem)); }
        if (options.preserveInterwordSpaces === true) { args.push('-c', 'preserve_interword_spaces=1'); }
        const result = await chayCongCu(CONG_CU.TESSERACT, args, { signal: options.signal, timeoutMs: options.timeoutMs, maxBufferBytes: options.maxBufferBytes });
        return { vanBan: String(result.stdout || '').replace(/\r\n/g, '\n').trim(), ngonNgu, congCu: 'tesseract', thoiGianMs: result.durationMs };
    } finally { await processCleanup.xoaDuongDanTam(thuMuc).catch(() => {}); }
}

module.exports = { NGON_NGU_MAC_DINH, DINH_DANG_ANH_HO_TRO, kiemTra, nhanDangBuffer };