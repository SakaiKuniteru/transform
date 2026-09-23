'use strict';
const authContext = require('../core/auth/auth-context');
const permissionService = require('../core/auth/permission.service');

function taoLoi(statusCode, code, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    error.expose = true;
    return error;
}

function layContext(req, res) { return req.authContext || authContext.ganAuthContext(req, res); }

function chuanHoaLoaiTaiKhoan(danhSach) {
    const ketQua = danhSach.flat(Infinity).filter(Boolean);
    if (!ketQua.length) { throw new TypeError('Phải cung cấp ít nhất một loại tài khoản.'); }
    for (const loaiTaiKhoan of ketQua) { if (!permissionService.laLoaiTaiKhoanHopLe(loaiTaiKhoan)) { throw new TypeError(`Loại tài khoản không hợp lệ: ${loaiTaiKhoan}.`); } }
    return ketQua;
}

function yeuCauLoaiTaiKhoan(...danhSach) {
    const loaiTaiKhoan = chuanHoaLoaiTaiKhoan(danhSach);
    return function permissionLoaiTaiKhoanMiddleware(req, res, next) {
        const context = layContext(req, res);
        if (!context.daDangNhap) { return next(taoLoi(401, 'YEU_CAU_DANG_NHAP', 'Bạn cần đăng nhập để tiếp tục.')); }
        if (!permissionService.coLoaiTaiKhoan(context.nguoiDung, ...loaiTaiKhoan)) { return next(taoLoi(403, 'KHONG_CO_QUYEN', 'Bạn không có quyền truy cập khu vực này.')); }
        return next();
    };
}

function yeuCauQuyen(kiemTra, options = {}) {
    if (typeof kiemTra !== 'function') { throw new TypeError('Hàm kiểm tra quyền phải là function.'); }
    return async function permissionMiddleware(req, res, next) {
        try { const context = layContext(req, res); if (!context.daDangNhap) { return next(taoLoi(401, 'YEU_CAU_DANG_NHAP', 'Bạn cần đăng nhập để tiếp tục.')); } const duocPhep = await kiemTra(context, req); if (!duocPhep) { return next(taoLoi(403, options.code || 'KHONG_CO_QUYEN', options.message || 'Bạn không có quyền thực hiện thao tác này.')); } return next(); } catch (error) { return next(error); }
    };
}

module.exports = {
    yeuCauLoaiTaiKhoan,
    yeuCauQuyen
};