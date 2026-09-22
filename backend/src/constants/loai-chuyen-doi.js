'use strict';

const { loaiChuyenDoi } = require('@transform/shared');

const { LOAI_CHUYEN_DOI } = loaiChuyenDoi;

const DANH_SACH_LOAI_CHUYEN_DOI_HO_TRO = Object.freeze([
    LOAI_CHUYEN_DOI.CHUYEN_DINH_DANG,
    LOAI_CHUYEN_DOI.MA_HOA,
    LOAI_CHUYEN_DOI.GIAI_MA,
    LOAI_CHUYEN_DOI.NEN,
    LOAI_CHUYEN_DOI.GIAI_NEN,
    LOAI_CHUYEN_DOI.TACH,
    LOAI_CHUYEN_DOI.TRICH_XUAT,
    LOAI_CHUYEN_DOI.DICH,
    LOAI_CHUYEN_DOI.DINH_DANG_LAI,
    LOAI_CHUYEN_DOI.THU_GON,
    LOAI_CHUYEN_DOI.KIEM_TRA,
    LOAI_CHUYEN_DOI.CHINH_SUA,
    LOAI_CHUYEN_DOI.THAY_THE,
    LOAI_CHUYEN_DOI.TOM_TAT,
    LOAI_CHUYEN_DOI.CHUAN_HOA,
    LOAI_CHUYEN_DOI.DOI_KICH_THUOC,
    LOAI_CHUYEN_DOI.TOI_UU_HINH_ANH,
    LOAI_CHUYEN_DOI.XOAY,
    LOAI_CHUYEN_DOI.CAT,
    LOAI_CHUYEN_DOI.OCR
]);

function laLoaiChuyenDoiDaHoTro(value) {
    const loai = String(value || '').trim().toUpperCase();
    return DANH_SACH_LOAI_CHUYEN_DOI_HO_TRO.includes(loai);
}

module.exports = {
    ...loaiChuyenDoi,
    DANH_SACH_LOAI_CHUYEN_DOI_HO_TRO,
    laLoaiChuyenDoiDaHoTro
};