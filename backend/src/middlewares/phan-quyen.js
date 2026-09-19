'use strict';

const MA_LOI = require('../constants/ma-loi');
const { loiChuaXacThuc, loiKhongCoQuyen } = require('../utils/loi');


const LOAI_TAI_KHOAN = Object.freeze({
    NGUOI_DUNG: 'NGUOI_DUNG',
    QUAN_TRI: 'QUAN_TRI',
    HE_THONG: 'HE_THONG'
});

const CAC_LOAI_TAI_KHOAN = new Set(
    Object.values(LOAI_TAI_KHOAN)
);


function chuanHoaDanhSach(danhSach) {
    const ketQua = danhSach.flat().filter(Boolean);

    if (!ketQua.length) { throw new TypeError('Phải cung cấp ít nhất một loại tài khoản.'); }

    for (const loai of ketQua) {
        if (!CAC_LOAI_TAI_KHOAN.has(loai)) { throw new TypeError(`Loại tài khoản không hợp lệ: ${loai}.`); }
    }

    return new Set(ketQua);
}


function yeuCauLoaiTaiKhoan(...danhSach) {
    const choPhep = chuanHoaDanhSach(danhSach);

    return function phanQuyenMiddleware(req, res, next) {
        if (!req.user?.id) {
            return next(
                loiChuaXacThuc(
                    'Bạn cần đăng nhập để thực hiện thao tác này.',
                    MA_LOI.CHUA_XAC_THUC
                )
            );
        }

        if (!choPhep.has(req.user.loaiTaiKhoan)) {
            return next(
                loiKhongCoQuyen(
                    'Bạn không có quyền thực hiện thao tác này.',
                    MA_LOI.KHONG_CO_QUYEN
                )
            );
        }

        return next();
    };
}


const yeuCauQuanTri = yeuCauLoaiTaiKhoan(
    LOAI_TAI_KHOAN.QUAN_TRI
);


const yeuCauNguoiDungHoacQuanTri = yeuCauLoaiTaiKhoan(
    LOAI_TAI_KHOAN.NGUOI_DUNG,
    LOAI_TAI_KHOAN.QUAN_TRI
);


const yeuCauHeThong = yeuCauLoaiTaiKhoan(
    LOAI_TAI_KHOAN.HE_THONG
);


module.exports = {
    LOAI_TAI_KHOAN,
    yeuCauLoaiTaiKhoan,
    yeuCauQuanTri,
    yeuCauNguoiDungHoacQuanTri,
    yeuCauHeThong
};