'use strict';
const { LOAI_TAI_KHOAN } = require('../core/auth/permission.service');
const { yeuCauLoaiTaiKhoan } = require('./permission.middleware');
const middleware = yeuCauLoaiTaiKhoan(LOAI_TAI_KHOAN.QUAN_TRI);

function adminMiddleware(req, res, next) { return middleware(req, res, next); }

module.exports = {
    adminMiddleware
};