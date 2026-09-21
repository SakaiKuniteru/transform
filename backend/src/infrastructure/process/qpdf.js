'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { CONG_CU, chayCongCu, kiemTraCongCu } = require('./process-runner');

function chuanHoaDuongDan(value, ten) {
    const duongDan = String(value || '').trim();
    if (!duongDan) { throw new TypeError(`${ten} không được để trống.`); }
    return path.resolve(duongDan);
}

function chuanHoaPageSpec(value) {
    const spec = String(value || '').trim();
    if (!/^\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*$/.test(spec)) { throw new TypeError('Danh sách trang qpdf chỉ hỗ trợ dạng 1, 1-3 hoặc 1-3,5,7-9.'); }
    return spec;
}

async function damBaoTepTonTai(duongDan) { await fs.promises.access(duongDan, fs.constants.R_OK); }

async function kiemTra() { return kiemTraCongCu(CONG_CU.QPDF, ['--version']); }

async function kiemTraPdf(duongDanNguon, options = {}) {
    const nguon = chuanHoaDuongDan(duongDanNguon, 'Đường dẫn PDF nguồn');
    await damBaoTepTonTai(nguon);
    const ketQua = await chayCongCu(CONG_CU.QPDF, ['--check', nguon], { ...options, exitCodes: [0, 3] });
    return { hopLe: ketQua.exitCode === 0 || ketQua.exitCode === 3, coCanhBao: ketQua.exitCode === 3, ...ketQua };
}

async function laySoTrang(duongDanNguon, options = {}) {
    const nguon = chuanHoaDuongDan(duongDanNguon, 'Đường dẫn PDF nguồn');
    await damBaoTepTonTai(nguon);
    const ketQua = await chayCongCu(CONG_CU.QPDF, ['--show-npages', nguon], options);
    const soTrang = Number(String(ketQua.stdout || '').trim());
    if (!Number.isSafeInteger(soTrang) || soTrang <= 0) { throw new Error('qpdf không trả số trang PDF hợp lệ.'); }
    return soTrang;
}

async function tuyenTinhHoa(duongDanNguon, duongDanDich, options = {}) {
    const nguon = chuanHoaDuongDan(duongDanNguon, 'Đường dẫn PDF nguồn');
    const dich = chuanHoaDuongDan(duongDanDich, 'Đường dẫn PDF đích');
    await damBaoTepTonTai(nguon);
    await fs.promises.mkdir(path.dirname(dich), { recursive: true });
    const ketQua = await chayCongCu(CONG_CU.QPDF, ['--linearize', nguon, dich], options);
    return { ...ketQua, duongDanNguon: nguon, duongDanDich: dich };
}

async function gop(danhSachNguon, duongDanDich, options = {}) {
    if (!Array.isArray(danhSachNguon) || danhSachNguon.length < 2) { throw new TypeError('Gộp PDF cần ít nhất 2 tệp nguồn.'); }
    const danhSach = danhSachNguon.map((item) => chuanHoaDuongDan(item, 'Đường dẫn PDF nguồn'));
    const dich = chuanHoaDuongDan(duongDanDich, 'Đường dẫn PDF đích');
    await Promise.all(danhSach.map(damBaoTepTonTai));
    await fs.promises.mkdir(path.dirname(dich), { recursive: true });
    const args = ['--empty', '--pages'];
    for (const item of danhSach) { args.push(item, '1-z'); }
    args.push('--', dich);
    const ketQua = await chayCongCu(CONG_CU.QPDF, args, options);
    return { ...ketQua, danhSachNguon: danhSach, duongDanDich: dich };
}

async function tach(duongDanNguon, pageSpec, duongDanDich, options = {}) {
    const nguon = chuanHoaDuongDan(duongDanNguon, 'Đường dẫn PDF nguồn');
    const dich = chuanHoaDuongDan(duongDanDich, 'Đường dẫn PDF đích');
    const spec = chuanHoaPageSpec(pageSpec);
    await damBaoTepTonTai(nguon);
    await fs.promises.mkdir(path.dirname(dich), { recursive: true });
    const ketQua = await chayCongCu(CONG_CU.QPDF, [nguon, '--pages', '.', spec, '--', dich], options);
    return { ...ketQua, pageSpec: spec, duongDanNguon: nguon, duongDanDich: dich };
}

module.exports = {
    kiemTra,
    kiemTraPdf,
    laySoTrang,
    tuyenTinhHoa,
    gop,
    tach
};