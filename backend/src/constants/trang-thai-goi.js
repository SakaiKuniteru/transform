'use strict';

const CHU_KY_GOI_DICH_VU = Object.freeze({
    THANG: 'THANG',
    NAM: 'NAM',
    MOT_LAN: 'MOT_LAN'
});

const TRANG_THAI_DANG_KY_GOI = Object.freeze({
    CHO_THANH_TOAN: 'CHO_THANH_TOAN',
    HOAT_DONG: 'HOAT_DONG',
    TAM_DUNG: 'TAM_DUNG',
    HET_HAN: 'HET_HAN',
    DA_HUY: 'DA_HUY'
});

const NGUON_KICH_HOAT_GOI = Object.freeze({
    THANH_TOAN: 'THANH_TOAN',
    QUAN_TRI: 'QUAN_TRI',
    KHUYEN_MAI: 'KHUYEN_MAI',
    HE_THONG: 'HE_THONG'
});

const DANH_SACH_CHU_KY_GOI_DICH_VU = Object.freeze(Object.values(CHU_KY_GOI_DICH_VU));
const DANH_SACH_TRANG_THAI_DANG_KY_GOI = Object.freeze(Object.values(TRANG_THAI_DANG_KY_GOI));
const DANH_SACH_NGUON_KICH_HOAT_GOI = Object.freeze(Object.values(NGUON_KICH_HOAT_GOI));

function laChuKyGoiDichVuHopLe(value) { return DANH_SACH_CHU_KY_GOI_DICH_VU.includes(value); }
function laTrangThaiDangKyGoiHopLe(value) { return DANH_SACH_TRANG_THAI_DANG_KY_GOI.includes(value); }
function laNguonKichHoatGoiHopLe(value) { return DANH_SACH_NGUON_KICH_HOAT_GOI.includes(value); }
function laDangHoatDong(value) { return value === TRANG_THAI_DANG_KY_GOI.HOAT_DONG; }
function laDaKetThuc(value) {
    return value === TRANG_THAI_DANG_KY_GOI.HET_HAN || value === TRANG_THAI_DANG_KY_GOI.DA_HUY;
}

module.exports = {
    CHU_KY_GOI_DICH_VU,
    TRANG_THAI_DANG_KY_GOI,
    NGUON_KICH_HOAT_GOI,
    DANH_SACH_CHU_KY_GOI_DICH_VU,
    DANH_SACH_TRANG_THAI_DANG_KY_GOI,
    DANH_SACH_NGUON_KICH_HOAT_GOI,
    laChuKyGoiDichVuHopLe,
    laTrangThaiDangKyGoiHopLe,
    laNguonKichHoatGoiHopLe,
    laDangHoatDong,
    laDaKetThuc
};