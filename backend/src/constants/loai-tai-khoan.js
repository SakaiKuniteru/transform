'use strict';

const LOAI_TAI_KHOAN = Object.freeze({
    NGUOI_DUNG: 'NGUOI_DUNG',
    QUAN_TRI: 'QUAN_TRI',
    HE_THONG: 'HE_THONG'
});

const DANH_SACH_LOAI_TAI_KHOAN = Object.freeze(Object.values(LOAI_TAI_KHOAN));

function laLoaiTaiKhoanHopLe(value) { return DANH_SACH_LOAI_TAI_KHOAN.includes(value); }

function laNguoiDung(value) { return value === LOAI_TAI_KHOAN.NGUOI_DUNG; }

function laQuanTri(value) { return value === LOAI_TAI_KHOAN.QUAN_TRI; }

function laHeThong(value) { return value === LOAI_TAI_KHOAN.HE_THONG; }

module.exports = {
    LOAI_TAI_KHOAN,
    DANH_SACH_LOAI_TAI_KHOAN,
    laLoaiTaiKhoanHopLe,
    laNguoiDung,
    laQuanTri,
    laHeThong
};