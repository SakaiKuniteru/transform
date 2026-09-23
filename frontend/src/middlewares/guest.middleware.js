'use strict';
const authContext = require('../core/auth/auth-context');

function layTrangSauDangNhap(context) {
    if (context?.laQuanTri) { return '/admin'; }
    if (context?.laNguoiDung) { return '/user'; }
    return '/';
}

function guestMiddleware(req, res, next) {
    const context = req.authContext || authContext.ganAuthContext(req, res);
    if (!context.daDangNhap) { return next(); }
    return res.redirect(303, layTrangSauDangNhap(context));
}

module.exports = {
    guestMiddleware,
    layTrangSauDangNhap
};