'use strict';
const crypto = require('node:crypto');
const securityConfig = require('../config/security.config');

function batBuocSession(req) {
    if (!req?.session) { throw new TypeError('CSRF middleware yêu cầu session middleware chạy trước.'); }
    return req.session;
}

function taoToken() { return crypto.randomBytes(securityConfig.csrf.tokenBytes).toString('hex'); }

function soSanhToken(tokenA, tokenB) {
    if (typeof tokenA !== 'string' || typeof tokenB !== 'string') { return false; }
    const bufferA = Buffer.from(tokenA);
    const bufferB = Buffer.from(tokenB);
    if (bufferA.length !== bufferB.length) { return false; }
    return crypto.timingSafeEqual(bufferA, bufferB);
}

function layTokenTuRequest(req) { return req.get(securityConfig.csrf.headerName) || req.body?.[securityConfig.csrf.fieldName] || null; }

function layHoacTaoToken(req) {
    const session = batBuocSession(req);
    if (!session.csrfToken) { session.csrfToken = taoToken(); }
    return session.csrfToken;
}

function csrfMiddleware(req, res, next) {
    if (!securityConfig.csrf.enabled) { return next(); }
    try { const token = layHoacTaoToken(req); res.locals.csrfToken = token; if (securityConfig.csrf.safeMethods.includes(req.method)) { return next(); } if (soSanhToken(layTokenTuRequest(req), token)) { return next(); } if (req.method === 'POST' && ['/dang-nhap', '/dang-ky', '/quen-mat-khau', '/dat-lai-mat-khau', '/xac-thuc-email'].includes(req.path) && req.accepts(['html', 'json']) === 'html') { req.flash?.('warning', 'Biểu mẫu đã hết hạn. Vui lòng nhập lại thông tin trên trang mới.'); return res.redirect(303, req.path); } const error = new Error('CSRF token không hợp lệ hoặc đã hết hạn.'); error.statusCode = 403; error.code = 'CSRF_KHONG_HOP_LE'; error.expose = true; return next(error); } catch (error) { return next(error); }
}

function doiCsrfToken(req, res = null) {
    const session = batBuocSession(req);
    session.csrfToken = taoToken();
    if (res) { res.locals.csrfToken = session.csrfToken; }
    return session.csrfToken;
}

module.exports = {
    csrfMiddleware,
    layHoacTaoToken,
    doiCsrfToken
};