'use strict';

const DOI_TUONG_HAN_MUC = Object.freeze({
    KHACH: 'KHACH',
    NGUOI_DUNG: 'NGUOI_DUNG',
    LOAI_TAI_KHOAN: 'LOAI_TAI_KHOAN',
    GOI_DICH_VU: 'GOI_DICH_VU'
});

const DON_VI_HAN_MUC = Object.freeze({
    LAN: 'LAN',
    TEP: 'TEP',
    BYTE: 'BYTE'
});

const CHU_KY_HAN_MUC = Object.freeze({
    MOI_REQUEST: 'MOI_REQUEST',
    MOI_TEP: 'MOI_TEP',
    NGAY: 'NGAY',
    TUAN: 'TUAN',
    THANG: 'THANG',
    THEO_GOI: 'THEO_GOI',
    TOAN_THOI_GIAN: 'TOAN_THOI_GIAN'
});

const HANH_DONG_KHI_VUOT = Object.freeze({
    TU_CHOI: 'TU_CHOI',
    YEU_CAU_DANG_NHAP: 'YEU_CAU_DANG_NHAP',
    YEU_CAU_NANG_CAP: 'YEU_CAU_NANG_CAP'
});

const MA_HAN_MUC = Object.freeze({
    UPLOAD_TONG_SO_LAN: 'UPLOAD_TONG_SO_LAN',
    UPLOAD_TONG_SO_TEP: 'UPLOAD_TONG_SO_TEP',
    UPLOAD_SO_TEP_MOI_LAN: 'UPLOAD_SO_TEP_MOI_LAN',
    UPLOAD_KICH_THUOC_MOI_TEP: 'UPLOAD_KICH_THUOC_MOI_TEP'
});

const MA_HAN_MUC_UPLOAD = Object.freeze([
    MA_HAN_MUC.UPLOAD_TONG_SO_LAN,
    MA_HAN_MUC.UPLOAD_TONG_SO_TEP,
    MA_HAN_MUC.UPLOAD_SO_TEP_MOI_LAN,
    MA_HAN_MUC.UPLOAD_KICH_THUOC_MOI_TEP
]);

const DANH_SACH_DOI_TUONG_HAN_MUC = Object.freeze(Object.values(DOI_TUONG_HAN_MUC));
const DANH_SACH_DON_VI_HAN_MUC = Object.freeze(Object.values(DON_VI_HAN_MUC));
const DANH_SACH_CHU_KY_HAN_MUC = Object.freeze(Object.values(CHU_KY_HAN_MUC));
const DANH_SACH_HANH_DONG_KHI_VUOT = Object.freeze(Object.values(HANH_DONG_KHI_VUOT));
const DANH_SACH_MA_HAN_MUC = Object.freeze(Object.values(MA_HAN_MUC));

function laDoiTuongHanMucHopLe(value) { return DANH_SACH_DOI_TUONG_HAN_MUC.includes(value); }
function laDonViHanMucHopLe(value) { return DANH_SACH_DON_VI_HAN_MUC.includes(value); }
function laChuKyHanMucHopLe(value) { return DANH_SACH_CHU_KY_HAN_MUC.includes(value); }
function laHanhDongKhiVuotHopLe(value) { return DANH_SACH_HANH_DONG_KHI_VUOT.includes(value); }
function laMaHanMucHopLe(value) { return DANH_SACH_MA_HAN_MUC.includes(value); }
function laMaHanMucUpload(value) { return MA_HAN_MUC_UPLOAD.includes(value); }

module.exports = {
    DOI_TUONG_HAN_MUC,
    DON_VI_HAN_MUC,
    CHU_KY_HAN_MUC,
    HANH_DONG_KHI_VUOT,
    MA_HAN_MUC,
    MA_HAN_MUC_UPLOAD,
    DANH_SACH_DOI_TUONG_HAN_MUC,
    DANH_SACH_DON_VI_HAN_MUC,
    DANH_SACH_CHU_KY_HAN_MUC,
    DANH_SACH_HANH_DONG_KHI_VUOT,
    DANH_SACH_MA_HAN_MUC,
    laDoiTuongHanMucHopLe,
    laDonViHanMucHopLe,
    laChuKyHanMucHopLe,
    laHanhDongKhiVuotHopLe,
    laMaHanMucHopLe,
    laMaHanMucUpload
};