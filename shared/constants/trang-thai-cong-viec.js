'use strict';

const TRANG_THAI_CONG_VIEC = Object.freeze({
    CHO_XU_LY: 'CHO_XU_LY',
    DANG_PHAN_TICH: 'DANG_PHAN_TICH',
    DANG_XU_LY: 'DANG_XU_LY',
    DANG_CHUYEN_DOI: 'DANG_CHUYEN_DOI',
    DANG_OCR: 'DANG_OCR',
    DANG_DICH: 'DANG_DICH',
    DANG_KET_XUAT: 'DANG_KET_XUAT',
    HOAN_THANH: 'HOAN_THANH',
    THAT_BAI: 'THAT_BAI',
    DANG_HUY: 'DANG_HUY',
    DA_HUY: 'DA_HUY'
});

const TRANG_THAI_KET_THUC = Object.freeze([
    TRANG_THAI_CONG_VIEC.HOAN_THANH,
    TRANG_THAI_CONG_VIEC.THAT_BAI,
    TRANG_THAI_CONG_VIEC.DA_HUY
]);

const TRANG_THAI_DANG_XU_LY = Object.freeze([
    TRANG_THAI_CONG_VIEC.DANG_PHAN_TICH,
    TRANG_THAI_CONG_VIEC.DANG_XU_LY,
    TRANG_THAI_CONG_VIEC.DANG_CHUYEN_DOI,
    TRANG_THAI_CONG_VIEC.DANG_OCR,
    TRANG_THAI_CONG_VIEC.DANG_DICH,
    TRANG_THAI_CONG_VIEC.DANG_KET_XUAT,
    TRANG_THAI_CONG_VIEC.DANG_HUY
]);

const THONG_TIN_TRANG_THAI = Object.freeze({
    [TRANG_THAI_CONG_VIEC.CHO_XU_LY]: { ma: TRANG_THAI_CONG_VIEC.CHO_XU_LY, ten: 'Chờ xử lý', tienTrinhMacDinh: 0 },
    [TRANG_THAI_CONG_VIEC.DANG_PHAN_TICH]: { ma: TRANG_THAI_CONG_VIEC.DANG_PHAN_TICH, ten: 'Đang phân tích', tienTrinhMacDinh: 5 },
    [TRANG_THAI_CONG_VIEC.DANG_XU_LY]: { ma: TRANG_THAI_CONG_VIEC.DANG_XU_LY, ten: 'Đang xử lý', tienTrinhMacDinh: 10 },
    [TRANG_THAI_CONG_VIEC.DANG_CHUYEN_DOI]: { ma: TRANG_THAI_CONG_VIEC.DANG_CHUYEN_DOI, ten: 'Đang chuyển đổi', tienTrinhMacDinh: 25 },
    [TRANG_THAI_CONG_VIEC.DANG_OCR]: { ma: TRANG_THAI_CONG_VIEC.DANG_OCR, ten: 'Đang nhận dạng OCR', tienTrinhMacDinh: 25 },
    [TRANG_THAI_CONG_VIEC.DANG_DICH]: { ma: TRANG_THAI_CONG_VIEC.DANG_DICH, ten: 'Đang dịch', tienTrinhMacDinh: 40 },
    [TRANG_THAI_CONG_VIEC.DANG_KET_XUAT]: { ma: TRANG_THAI_CONG_VIEC.DANG_KET_XUAT, ten: 'Đang kết xuất', tienTrinhMacDinh: 90 },
    [TRANG_THAI_CONG_VIEC.HOAN_THANH]: { ma: TRANG_THAI_CONG_VIEC.HOAN_THANH, ten: 'Hoàn thành', tienTrinhMacDinh: 100 },
    [TRANG_THAI_CONG_VIEC.THAT_BAI]: { ma: TRANG_THAI_CONG_VIEC.THAT_BAI, ten: 'Thất bại', tienTrinhMacDinh: null },
    [TRANG_THAI_CONG_VIEC.DANG_HUY]: { ma: TRANG_THAI_CONG_VIEC.DANG_HUY, ten: 'Đang hủy', tienTrinhMacDinh: null },
    [TRANG_THAI_CONG_VIEC.DA_HUY]: { ma: TRANG_THAI_CONG_VIEC.DA_HUY, ten: 'Đã hủy', tienTrinhMacDinh: null }
});

function coTrangThai(value) {
    if (!value) {
        return false;
    }

    return Boolean(THONG_TIN_TRANG_THAI[String(value).trim().toUpperCase()]);
}

function laTrangThaiKetThuc(value) {
    return TRANG_THAI_KET_THUC.includes(value);
}

function laDangXuLy(value) {
    return TRANG_THAI_DANG_XU_LY.includes(value);
}

function layThongTinTrangThai(value) {
    if (!value) {
        return null;
    }

    return THONG_TIN_TRANG_THAI[String(value).trim().toUpperCase()] || null;
}

module.exports = {
    TRANG_THAI_CONG_VIEC,
    TRANG_THAI_KET_THUC,
    TRANG_THAI_DANG_XU_LY,
    THONG_TIN_TRANG_THAI,
    coTrangThai,
    laTrangThaiKetThuc,
    laDangXuLy,
    layThongTinTrangThai
};