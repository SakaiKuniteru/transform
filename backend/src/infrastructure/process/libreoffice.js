'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { CONG_CU, chayCongCu, kiemTraCongCu } = require('./process-runner');

const DINH_DANG_DAU_RA = Object.freeze({ PDF: 'pdf', DOCX: 'docx', ODT: 'odt', HTML: 'html', TXT: 'txt' });
const FILTER_DAU_RA = Object.freeze({ pdf: 'pdf', docx: 'docx', odt: 'odt', html: 'html:HTML', txt: 'txt:Text' });

function chuanHoaDuongDan(value, ten) { const duongDan = String(value || '').trim(); if (!duongDan) { throw new TypeError(`${ten} không được để trống.`); } return path.resolve(duongDan); }

function chuanHoaDinhDang(value) { const dinhDang = String(value || '').trim().toLowerCase(); if (!FILTER_DAU_RA[dinhDang]) { throw new TypeError(`Định dạng LibreOffice "${dinhDang || 'không xác định'}" chưa được hỗ trợ.`); } return dinhDang; }

async function damBaoTepTonTai(duongDan) { await fs.promises.access(duongDan, fs.constants.R_OK); }

async function kiemTra() { return kiemTraCongCu(CONG_CU.LIBREOFFICE, ['--version']); }

async function chuyenDoi(duongDanNguon, thuMucDich, dinhDangDich, options = {}) {
    const nguon = chuanHoaDuongDan(duongDanNguon, 'Đường dẫn tài liệu nguồn');
    const outDir = chuanHoaDuongDan(thuMucDich, 'Thư mục đầu ra');
    const dinhDang = chuanHoaDinhDang(dinhDangDich);
    await damBaoTepTonTai(nguon);
    await fs.promises.mkdir(outDir, { recursive: true });
    const profileDir = options.profileDir ? chuanHoaDuongDan(options.profileDir, 'Thư mục profile LibreOffice') : path.join(outDir, `.lo-profile-${process.pid}-${crypto.randomUUID()}`);
    await fs.promises.mkdir(profileDir, { recursive: true });
    const args = [`-env:UserInstallation=${pathToFileURL(profileDir).href}`, '--headless', '--nologo', '--nodefault', '--nofirststartwizard', '--convert-to', FILTER_DAU_RA[dinhDang], '--outdir', outDir, nguon];
    try {
        const ketQua = await chayCongCu(CONG_CU.LIBREOFFICE, args, { signal: options.signal, timeoutMs: options.timeoutMs, maxBufferBytes: options.maxBufferBytes });
        const tenCoSo = path.basename(nguon, path.extname(nguon));
        const danhSach = await fs.promises.readdir(outDir);
        const tenKetQua = danhSach.find((item) => path.basename(item, path.extname(item)) === tenCoSo && path.extname(item).slice(1).toLowerCase() === dinhDang && path.resolve(outDir, item) !== nguon);
        if (!tenKetQua) { throw new Error(`LibreOffice không tạo được tệp .${dinhDang} đầu ra.`); }
        const duongDanDich = path.join(outDir, tenKetQua);
        const stat = await fs.promises.stat(duongDanDich);
        if (!stat.isFile() || stat.size <= 0) { throw new Error('LibreOffice tạo tệp đầu ra không hợp lệ.'); }
        return { ...ketQua, dinhDang, duongDanNguon: nguon, duongDanDich, kichThuocBytes: stat.size };
    } finally { if (!options.profileDir) { await fs.promises.rm(profileDir, { recursive: true, force: true }).catch(() => {}); } }
}

module.exports = {
    DINH_DANG_DAU_RA,
    FILTER_DAU_RA,
    kiemTra,
    chuyenDoi
};