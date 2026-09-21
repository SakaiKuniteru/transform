'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { CONG_CU, chayCongCu, kiemTraCongCu } = require('./process-runner');

const DINH_DANG_ANH = Object.freeze({ PNG: 'png', JPEG: 'jpeg', JPG: 'jpg' });

function chuanHoaDuongDan(value, ten) {
    const duongDan = String(value || '').trim();
    if (!duongDan) { throw new TypeError(`${ten} không được để trống.`); }
    return path.resolve(duongDan);
}

function chuanHoaSoNguyen(value, ten, macDinh = null, min = 1, max = Number.MAX_SAFE_INTEGER) {
    if (value === undefined || value === null || value === '') { return macDinh; }
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < min || number > max) { throw new TypeError(`${ten} phải là số nguyên từ ${min} đến ${max}.`); }
    return number;
}

function chuanHoaDinhDangAnh(value = DINH_DANG_ANH.PNG) {
    const dinhDang = String(value || DINH_DANG_ANH.PNG).trim().toLowerCase();
    if (![DINH_DANG_ANH.PNG, DINH_DANG_ANH.JPEG, DINH_DANG_ANH.JPG].includes(dinhDang)) { throw new TypeError('Poppler chỉ hỗ trợ render PNG hoặc JPEG.'); }
    return dinhDang === DINH_DANG_ANH.JPG ? DINH_DANG_ANH.JPEG : dinhDang;
}

async function damBaoTepTonTai(duongDan) { await fs.promises.access(duongDan, fs.constants.R_OK); }

async function kiemTra() {
    const [pdftotext, pdftoppm] = await Promise.all([
        kiemTraCongCu(CONG_CU.PDFTOTEXT, ['-v'], { exitCodes: [0] }),
        kiemTraCongCu(CONG_CU.PDFTOPPM, ['-v'], { exitCodes: [0] })
    ]);
    return { available: true, pdftotext, pdftoppm };
}

async function trichXuatVanBan(duongDanNguon, duongDanDich, options = {}) {
    const nguon = chuanHoaDuongDan(duongDanNguon, 'Đường dẫn PDF nguồn');
    const dich = chuanHoaDuongDan(duongDanDich, 'Đường dẫn text đích');
    await damBaoTepTonTai(nguon);
    await fs.promises.mkdir(path.dirname(dich), { recursive: true });
    const trangTu = chuanHoaSoNguyen(options.trangTu, 'Trang bắt đầu');
    const trangDen = chuanHoaSoNguyen(options.trangDen, 'Trang kết thúc');
    if (trangTu && trangDen && trangTu > trangDen) { throw new TypeError('Trang bắt đầu không được lớn hơn trang kết thúc.'); }
    const args = [];
    if (trangTu) { args.push('-f', trangTu); }
    if (trangDen) { args.push('-l', trangDen); }
    if (options.layout === true) { args.push('-layout'); }
    if (options.raw === true) { args.push('-raw'); }
    if (options.khongNgatTrang === true) { args.push('-nopgbrk'); }
    args.push('-enc', String(options.encoding || 'UTF-8'), nguon, dich);
    const ketQua = await chayCongCu(CONG_CU.PDFTOTEXT, args, { signal: options.signal, timeoutMs: options.timeoutMs, maxBufferBytes: options.maxBufferBytes });
    return { ...ketQua, duongDanNguon: nguon, duongDanDich: dich };
}

async function renderAnh(duongDanNguon, outputPrefix, options = {}) {
    const nguon = chuanHoaDuongDan(duongDanNguon, 'Đường dẫn PDF nguồn');
    const prefix = chuanHoaDuongDan(outputPrefix, 'Prefix ảnh đầu ra');
    await damBaoTepTonTai(nguon);
    await fs.promises.mkdir(path.dirname(prefix), { recursive: true });
    const dinhDang = chuanHoaDinhDangAnh(options.dinhDang);
    const trangTu = chuanHoaSoNguyen(options.trangTu, 'Trang bắt đầu', 1);
    const trangDen = chuanHoaSoNguyen(options.trangDen, 'Trang kết thúc', trangTu);
    const dpi = chuanHoaSoNguyen(options.dpi, 'DPI', 144, 36, 600);
    if (trangTu > trangDen) { throw new TypeError('Trang bắt đầu không được lớn hơn trang kết thúc.'); }
    const args = ['-f', trangTu, '-l', trangDen, '-r', dpi];
    if (options.cropBox === true) { args.push('-cropbox'); }
    if (options.singleFile === true) { args.push('-singlefile'); }
    if (dinhDang === DINH_DANG_ANH.PNG) { args.push('-png'); } else {
        args.push('-jpeg');
        const quality = chuanHoaSoNguyen(options.quality, 'JPEG quality', 85, 1, 100);
        args.push('-jpegopt', `quality=${quality}`);
    }
    args.push(nguon, prefix);
    const ketQua = await chayCongCu(CONG_CU.PDFTOPPM, args, { signal: options.signal, timeoutMs: options.timeoutMs, maxBufferBytes: options.maxBufferBytes });
    const thuMuc = path.dirname(prefix);
    const tenPrefix = path.basename(prefix);
    const extension = dinhDang === DINH_DANG_ANH.PNG ? '.png' : '.jpg';
    const danhSachTep = (await fs.promises.readdir(thuMuc)).filter((item) => item.startsWith(tenPrefix) && item.toLowerCase().endsWith(extension)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map((item) => path.join(thuMuc, item));
    if (!danhSachTep.length) { throw new Error('Poppler không tạo được ảnh đầu ra.'); }
    return { ...ketQua, dinhDang, trangTu, trangDen, dpi, danhSachTep };
}

module.exports = {
    DINH_DANG_ANH,
    kiemTra,
    trichXuatVanBan,
    renderAnh
};