'use strict';
const sessionService = require('./session.service');
const permissionService = require('./permission.service');

function taoNguoiDungAnToan(nguoiDung) {
    if (!nguoiDung) { return null; }
    return { id: nguoiDung.id, email: nguoiDung.email || null, tenDangNhap: nguoiDung.tenDangNhap || null, hoTen: nguoiDung.hoTen || null, loaiTaiKhoan: nguoiDung.loaiTaiKhoan || null, trangThai: nguoiDung.trangThai || null, emailXacThucLuc: nguoiDung.emailXacThucLuc || null, caiDat: nguoiDung.caiDat || null };
}

function taoAuthContext(req) {
    const nguoiDung = taoNguoiDungAnToan(sessionService.layNguoiDung(req));
    return { daDangNhap: Boolean(nguoiDung?.id && sessionService.daDangNhap(req)), nguoiDung, loaiTaiKhoan: nguoiDung?.loaiTaiKhoan || null, laNguoiDung: permissionService.laNguoiDung(nguoiDung), laQuanTri: permissionService.laQuanTri(nguoiDung), laHeThong: permissionService.laHeThong(nguoiDung), coTheTruyCapKhuVucNguoiDung: permissionService.coTheTruyCapKhuVucNguoiDung(nguoiDung), coTheTruyCapKhuVucQuanTri: permissionService.coTheTruyCapKhuVucQuanTri(nguoiDung) };
}

function ganAuthContext(req, res) {
    const context = taoAuthContext(req);
    req.authContext = context;
    res.locals.auth = context;
    return context;
}

module.exports = { taoAuthContext, ganAuthContext };