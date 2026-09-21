'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { CONG_CU, chayCongCu, kiemTraCongCu } = require('./process-runner');

const DINH_DANG_NGUON = Object.freeze({ DOCX: 'docx', ODT: 'odt', HTML: 'html', MARKDOWN: 'markdown', TXT: 'plain' });
const DINH_DANG_DICH = Object.freeze({ HTML: 'html5', MARKDOWN: 'gfm', TXT: 'plain', DOCX: 'docx', ODT: 'odt' });

function chuanHoaDuongDan(value, ten) { const duongDan = String(value || '').trim(); if (!duongDan) { throw new TypeError(`${ten} không được để trống.`); } return path.resolve(duongDan); }

function chuanHoaDinhDangNguon(value) {
    const dinhDang = String(value || '').trim().toLowerCase();
    const aliases = { docx: DINH_DANG_NGUON.DOCX, odt: DINH_DANG_NGUON.ODT, html: DINH_DANG_NGUON.HTML, htm: DINH_DANG_NGUON.HTML, md: DINH_DANG_NGUON.MARKDOWN, markdown: DINH_DANG_NGUON.MARKDOWN, txt: DINH_DANG_NGUON.TXT, plain: DINH_DANG_NGUON.TXT };
    const ketQua = aliases[dinhDang];
    if (!ketQua) { throw new TypeError(`Định dạng nguồn Pandoc "${dinhDang || 'không xác định'}" chưa được hỗ trợ.`); }
    return ketQua;
}

function chuanHoaDinhDangDich(value) {
    const dinhDang = String(value || '').trim().toLowerCase();
    const aliases = { md: DINH_DANG_DICH.MARKDOWN, markdown: DINH_DANG_DICH.MARKDOWN, html: DINH_DANG_DICH.HTML, htm: DINH_DANG_DICH.HTML, txt: DINH_DANG_DICH.TXT, plain: DINH_DANG_DICH.TXT, docx: DINH_DANG_DICH.DOCX, odt: DINH_DANG_DICH.ODT };
    const ketQua = aliases[dinhDang];
    if (!ketQua) { throw new TypeError(`Định dạng đích Pandoc "${dinhDang || 'không xác định'}" chưa được hỗ trợ.`); }
    return ketQua;
}

async function damBaoTepTonTai(duongDan) { await fs.promises.access(duongDan, fs.constants.R_OK); }

async function kiemTra() { return kiemTraCongCu(CONG_CU.PANDOC, ['--version']); }

async function chuyenDoi(duongDanNguon, duongDanDich, options = {}) {
    const nguon = chuanHoaDuongDan(duongDanNguon, 'Đường dẫn tài liệu nguồn');
    const dich = chuanHoaDuongDan(duongDanDich, 'Đường dẫn tài liệu đích');
    const from = chuanHoaDinhDangNguon(options.from || path.extname(nguon).slice(1));
    const to = chuanHoaDinhDangDich(options.to || path.extname(dich).slice(1));
    await damBaoTepTonTai(nguon);
    await fs.promises.mkdir(path.dirname(dich), { recursive: true });
    const args = [`--from=${from}`, `--to=${to}`, '--output', dich];
    if (to === DINH_DANG_DICH.HTML && options.standalone !== false) { args.push('--standalone'); }
    if (options.wrap === 'none') { args.push('--wrap=none'); }
    if (options.extractMedia) { args.push(`--extract-media=${chuanHoaDuongDan(options.extractMedia, 'Thư mục media')}`); }
    if (Array.isArray(options.extraArgs)) {
        for (const item of options.extraArgs) {
            if (typeof item !== 'string' || !item.trim()) { throw new TypeError('Mỗi extraArgs của Pandoc phải là string không rỗng.'); }
            args.push(item);
        }
    }
    args.push(nguon);
    const ketQua = await chayCongCu(CONG_CU.PANDOC, args, { signal: options.signal, timeoutMs: options.timeoutMs, maxBufferBytes: options.maxBufferBytes });
    const stat = await fs.promises.stat(dich);
    if (!stat.isFile()) { throw new Error('Pandoc không tạo được tệp đầu ra.'); }
    return { ...ketQua, from, to, duongDanNguon: nguon, duongDanDich: dich, kichThuocBytes: stat.size };
}

module.exports = {
    DINH_DANG_NGUON,
    DINH_DANG_DICH,
    kiemTra,
    chuyenDoi
};