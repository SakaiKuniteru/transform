'use strict';

const LOAI_CHUYEN_DOI = Object.freeze({

    CHUYEN_DINH_DANG: 'CHUYEN_DINH_DANG',
    MA_HOA: 'MA_HOA',
    GIAI_MA: 'GIAI_MA',
    NEN: 'NEN',
    GIAI_NEN: 'GIAI_NEN',
    GOP: 'GOP',
    TACH: 'TACH',
    OCR: 'OCR',
    TRICH_XUAT: 'TRICH_XUAT',
    SO_SANH: 'SO_SANH',
    DICH: 'DICH',
    NHAN_DIEN_NGON_NGU: 'NHAN_DIEN_NGON_NGU',
    DINH_DANG_LAI: 'DINH_DANG_LAI',
    THU_GON: 'THU_GON',
    KIEM_TRA: 'KIEM_TRA',
    CHINH_SUA: 'CHINH_SUA',
    THAY_THE: 'THAY_THE',
    TOM_TAT: 'TOM_TAT',
    CHUAN_HOA: 'CHUAN_HOA',
    DOI_KICH_THUOC: 'DOI_KICH_THUOC',
    TOI_UU_HINH_ANH: 'TOI_UU_HINH_ANH',
    XOAY: 'XOAY',
    CAT: 'CAT'
});

const NHOM_CHUYEN_DOI = Object.freeze({
    DINH_DANG: 'DINH_DANG',
    MA_HOA: 'MA_HOA',
    TEP_NEN: 'TEP_NEN',
    TAI_LIEU: 'TAI_LIEU',
    NGON_NGU: 'NGON_NGU',
    NOI_DUNG: 'NOI_DUNG',
    HINH_ANH: 'HINH_ANH'
});

const THONG_TIN_LOAI_CHUYEN_DOI = Object.freeze({
    [LOAI_CHUYEN_DOI.CHUYEN_DINH_DANG]: { ma: LOAI_CHUYEN_DOI.CHUYEN_DINH_DANG, ten: 'Chuyển đổi định dạng', nhom: NHOM_CHUYEN_DOI.DINH_DANG },
    [LOAI_CHUYEN_DOI.MA_HOA]: { ma: LOAI_CHUYEN_DOI.MA_HOA, ten: 'Mã hóa', nhom: NHOM_CHUYEN_DOI.MA_HOA },
    [LOAI_CHUYEN_DOI.GIAI_MA]: { ma: LOAI_CHUYEN_DOI.GIAI_MA, ten: 'Giải mã', nhom: NHOM_CHUYEN_DOI.MA_HOA },
    [LOAI_CHUYEN_DOI.NEN]: { ma: LOAI_CHUYEN_DOI.NEN, ten: 'Nén', nhom: NHOM_CHUYEN_DOI.TEP_NEN },
    [LOAI_CHUYEN_DOI.GIAI_NEN]: { ma: LOAI_CHUYEN_DOI.GIAI_NEN, ten: 'Giải nén', nhom: NHOM_CHUYEN_DOI.TEP_NEN },
    [LOAI_CHUYEN_DOI.GOP]: { ma: LOAI_CHUYEN_DOI.GOP, ten: 'Gộp', nhom: NHOM_CHUYEN_DOI.TAI_LIEU },
    [LOAI_CHUYEN_DOI.TACH]: { ma: LOAI_CHUYEN_DOI.TACH, ten: 'Tách', nhom: NHOM_CHUYEN_DOI.TAI_LIEU },
    [LOAI_CHUYEN_DOI.OCR]: { ma: LOAI_CHUYEN_DOI.OCR, ten: 'Nhận dạng ký tự OCR', nhom: NHOM_CHUYEN_DOI.TAI_LIEU },
    [LOAI_CHUYEN_DOI.TRICH_XUAT]: { ma: LOAI_CHUYEN_DOI.TRICH_XUAT, ten: 'Trích xuất dữ liệu', nhom: NHOM_CHUYEN_DOI.TAI_LIEU },
    [LOAI_CHUYEN_DOI.SO_SANH]: { ma: LOAI_CHUYEN_DOI.SO_SANH, ten: 'So sánh', nhom: NHOM_CHUYEN_DOI.TAI_LIEU },
    [LOAI_CHUYEN_DOI.DICH]: { ma: LOAI_CHUYEN_DOI.DICH, ten: 'Dịch', nhom: NHOM_CHUYEN_DOI.NGON_NGU },
    [LOAI_CHUYEN_DOI.NHAN_DIEN_NGON_NGU]: { ma: LOAI_CHUYEN_DOI.NHAN_DIEN_NGON_NGU, ten: 'Nhận diện ngôn ngữ', nhom: NHOM_CHUYEN_DOI.NGON_NGU },
    [LOAI_CHUYEN_DOI.DINH_DANG_LAI]: { ma: LOAI_CHUYEN_DOI.DINH_DANG_LAI, ten: 'Định dạng lại', nhom: NHOM_CHUYEN_DOI.NOI_DUNG },
    [LOAI_CHUYEN_DOI.THU_GON]: { ma: LOAI_CHUYEN_DOI.THU_GON, ten: 'Thu gọn', nhom: NHOM_CHUYEN_DOI.NOI_DUNG },
    [LOAI_CHUYEN_DOI.KIEM_TRA]: { ma: LOAI_CHUYEN_DOI.KIEM_TRA, ten: 'Kiểm tra', nhom: NHOM_CHUYEN_DOI.NOI_DUNG },
    [LOAI_CHUYEN_DOI.CHINH_SUA]: { ma: LOAI_CHUYEN_DOI.CHINH_SUA, ten: 'Chỉnh sửa', nhom: NHOM_CHUYEN_DOI.NOI_DUNG },
    [LOAI_CHUYEN_DOI.THAY_THE]: { ma: LOAI_CHUYEN_DOI.THAY_THE, ten: 'Thay thế', nhom: NHOM_CHUYEN_DOI.NOI_DUNG },
    [LOAI_CHUYEN_DOI.TOM_TAT]: { ma: LOAI_CHUYEN_DOI.TOM_TAT, ten: 'Tóm tắt', nhom: NHOM_CHUYEN_DOI.NOI_DUNG },
    [LOAI_CHUYEN_DOI.CHUAN_HOA]: { ma: LOAI_CHUYEN_DOI.CHUAN_HOA, ten: 'Chuẩn hóa', nhom: NHOM_CHUYEN_DOI.NOI_DUNG },
    [LOAI_CHUYEN_DOI.DOI_KICH_THUOC]: { ma: LOAI_CHUYEN_DOI.DOI_KICH_THUOC, ten: 'Đổi kích thước', nhom: NHOM_CHUYEN_DOI.HINH_ANH },
    [LOAI_CHUYEN_DOI.TOI_UU_HINH_ANH]: { ma: LOAI_CHUYEN_DOI.TOI_UU_HINH_ANH, ten: 'Tối ưu hình ảnh', nhom: NHOM_CHUYEN_DOI.HINH_ANH },
    [LOAI_CHUYEN_DOI.XOAY]: { ma: LOAI_CHUYEN_DOI.XOAY, ten: 'Xoay', nhom: NHOM_CHUYEN_DOI.HINH_ANH },
    [LOAI_CHUYEN_DOI.CAT]: { ma: LOAI_CHUYEN_DOI.CAT, ten: 'Cắt', nhom: NHOM_CHUYEN_DOI.HINH_ANH }
});

function coLoaiChuyenDoi(value) {
    if (!value) {
        return false;
    }

    return Boolean(THONG_TIN_LOAI_CHUYEN_DOI[String(value).trim().toUpperCase()]);
}

function layThongTinLoaiChuyenDoi(value) {
    if (!value) {
        return null;
    }

    return THONG_TIN_LOAI_CHUYEN_DOI[String(value).trim().toUpperCase()] || null;
}

function layDanhSachLoaiChuyenDoi() {
    return Object.values(THONG_TIN_LOAI_CHUYEN_DOI);
}

module.exports = {
    LOAI_CHUYEN_DOI,
    NHOM_CHUYEN_DOI,
    THONG_TIN_LOAI_CHUYEN_DOI,
    coLoaiChuyenDoi,
    layThongTinLoaiChuyenDoi,
    layDanhSachLoaiChuyenDoi
};