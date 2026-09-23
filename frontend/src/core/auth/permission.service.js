'use strict';
const LOAI_TAI_KHOAN = Object.freeze({ NGUOI_DUNG: 'NGUOI_DUNG', QUAN_TRI: 'QUAN_TRI', HE_THONG: 'HE_THONG' });
const DANH_SACH_LOAI_TAI_KHOAN = Object.freeze(Object.values(LOAI_TAI_KHOAN));
const CAC_LOAI_TAI_KHOAN = new Set(DANH_SACH_LOAI_TAI_KHOAN);

function laLoaiTaiKhoanHopLe(value) { return CAC_LOAI_TAI_KHOAN.has(value); }

function chuanHoaDanhSach(danhSach) {
    const ketQua = danhSach.flat().filter(Boolean);
    if (!ketQua.length) { throw new TypeError('Phải cung cấp ít nhất một loại tài khoản.'); }
    for (const loai of ketQua) { if (!laLoaiTaiKhoanHopLe(loai)) { throw new TypeError(`Loại tài khoản không hợp lệ: ${loai}.`); } }
    return new Set(ketQua);
}

function coLoaiTaiKhoan(nguoiDung, ...danhSach) {
    if (!nguoiDung || !laLoaiTaiKhoanHopLe(nguoiDung.loaiTaiKhoan)) { return false; }
    return chuanHoaDanhSach(danhSach).has(nguoiDung.loaiTaiKhoan);
}

function laNguoiDung(nguoiDung) { return coLoaiTaiKhoan(nguoiDung, LOAI_TAI_KHOAN.NGUOI_DUNG); }

function laQuanTri(nguoiDung) { return coLoaiTaiKhoan(nguoiDung, LOAI_TAI_KHOAN.QUAN_TRI); }

function laHeThong(nguoiDung) { return coLoaiTaiKhoan(nguoiDung, LOAI_TAI_KHOAN.HE_THONG); }

function coTheTruyCapKhuVucNguoiDung(nguoiDung) { return coLoaiTaiKhoan(nguoiDung, LOAI_TAI_KHOAN.NGUOI_DUNG, LOAI_TAI_KHOAN.QUAN_TRI); }

function coTheTruyCapKhuVucQuanTri(nguoiDung) { return laQuanTri(nguoiDung); }

module.exports = { LOAI_TAI_KHOAN, DANH_SACH_LOAI_TAI_KHOAN, laLoaiTaiKhoanHopLe, coLoaiTaiKhoan, laNguoiDung, laQuanTri, laHeThong, coTheTruyCapKhuVucNguoiDung, coTheTruyCapKhuVucQuanTri };