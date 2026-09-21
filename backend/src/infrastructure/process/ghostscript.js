'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { CONG_CU, chayCongCu, kiemTraCongCu } = require('./process-runner');

const PDF_SETTINGS = Object.freeze({ SCREEN: 'screen', EBOOK: 'ebook', PRINTER: 'printer', PREPRESS: 'prepress', DEFAULT: 'default' });
const COMPATIBILITY_LEVELS = Object.freeze(['1.4', '1.5', '1.6', '1.7']);

function chuanHoaDuongDan(value, ten) {
    const duongDan = String(value || '').trim();
    if (!duongDan) { throw new TypeError(`${ten} không được để trống.`); }
    return path.resolve(duongDan);
}

function chuanHoaPdfSettings(value = PDF_SETTINGS.EBOOK) {
    const setting = String(value || PDF_SETTINGS.EBOOK).trim().toLowerCase();
    if (!Object.values(PDF_SETTINGS).includes(setting)) { throw new TypeError('PDF settings của Ghostscript không hợp lệ.'); }
    return setting;
}

function chuanHoaCompatibility(value = '1.7') {
    const level = String(value || '1.7').trim();
    if (!COMPATIBILITY_LEVELS.includes(level)) { throw new TypeError('PDF compatibility level không hợp lệ.'); }
    return level;
}

async function damBaoTepTonTai(duongDan) { await fs.promises.access(duongDan, fs.constants.R_OK); }

async function kiemTra() { return kiemTraCongCu(CONG_CU.GHOSTSCRIPT, ['--version']); }

async function toiUuPdf(duongDanNguon, duongDanDich, options = {}) {
    const nguon = chuanHoaDuongDan(duongDanNguon, 'Đường dẫn PDF nguồn');
    const dich = chuanHoaDuongDan(duongDanDich, 'Đường dẫn PDF đích');
    await damBaoTepTonTai(nguon);
    await fs.promises.mkdir(path.dirname(dich), { recursive: true });
    const setting = chuanHoaPdfSettings(options.pdfSettings);
    const compatibility = chuanHoaCompatibility(options.compatibilityLevel);
    const args = [
        '-dBATCH',
        '-dNOPAUSE',
        '-dSAFER',
        '-dQUIET',
        '-sDEVICE=pdfwrite',
        `-dCompatibilityLevel=${compatibility}`,
        `-dPDFSETTINGS=/${setting}`,
        '-dDetectDuplicateImages=true',
        '-dCompressFonts=true',
        '-dSubsetFonts=true',
        '-dAutoRotatePages=/None',
        `-sOutputFile=${dich}`,
        nguon
    ];
    const ketQua = await chayCongCu(CONG_CU.GHOSTSCRIPT, args, { signal: options.signal, timeoutMs: options.timeoutMs, maxBufferBytes: options.maxBufferBytes });
    const stat = await fs.promises.stat(dich);
    if (!stat.isFile() || stat.size <= 0) { throw new Error('Ghostscript không tạo được PDF đầu ra.'); }
    return { ...ketQua, pdfSettings: setting, compatibilityLevel: compatibility, duongDanNguon: nguon, duongDanDich: dich, kichThuocBytes: stat.size };
}

module.exports = {
    PDF_SETTINGS,
    COMPATIBILITY_LEVELS,
    kiemTra,
    toiUuPdf
};