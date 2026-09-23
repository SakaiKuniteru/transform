'use strict';
const TEN_FLASH = '_flash';
const LOAI_FLASH = new Set([ 'success', 'error', 'warning', 'info' ]);

function batBuocSession(req) {
    if (!req?.session) { throw new TypeError('Flash middleware yêu cầu session middleware chạy trước.'); }
    return req.session;
}

function chuanHoaFlash(type, message, options = {}) {
    const loai = LOAI_FLASH.has(type) ? type : 'info';
    const thongBao = typeof message === 'string' ? message.trim() : '';
    if (!thongBao) { throw new TypeError('Nội dung flash không hợp lệ.'); }
    return { type: loai, title: typeof options.title === 'string' && options.title.trim() ? options.title.trim() : null, message: thongBao, duration: Number.isSafeInteger(options.duration) && options.duration >= 0 ? options.duration : 5000, persistent: options.persistent === true };
}

function themFlash(req, type, message, options = {}) {
    const session = batBuocSession(req);
    const flash = chuanHoaFlash(type, message, options);
    if (!Array.isArray(session[TEN_FLASH])) { session[TEN_FLASH] = []; }
    session[TEN_FLASH].push(flash);
    return flash;
}

function layFlash(req) {
    const session = batBuocSession(req);
    const danhSach = Array.isArray(session[TEN_FLASH]) ? session[TEN_FLASH] : [];
    delete session[TEN_FLASH];
    return danhSach;
}

function flashMiddleware(req, res, next) {
    try { const danhSach = layFlash(req); res.locals.toasts = [ ...(Array.isArray(res.locals.toasts) ? res.locals.toasts : []), ...danhSach ]; req.flash = (type, message, options = {}) => themFlash(req, type, message, options); return next(); } catch (error) { return next(error); }
}

module.exports = {
    flashMiddleware,
    themFlash,
    layFlash
};