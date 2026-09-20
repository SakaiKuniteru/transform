'use strict';

const { COOKIE_CONFIG } = require('../config/security');
const service = require('../modules/phien-khach/phien-khach.service');

const TEN_COOKIE = COOKIE_CONFIG.guestTokenName;

function layToken(req) {
    const value = req.signedCookies?.[TEN_COOKIE];
    return typeof value === 'string' && value ? value : null;
}

async function damBaoPhienKhach(req, res, next) {
    try {
        if (req.user?.id) { return next(); }
        const ketQua = await service.layHoacTao({
            token: layToken(req),
            diaChiIp: req.ip || null,
            userAgent: req.get('user-agent') || null
        });
        req.phienKhach = ketQua.phienKhach;
        req.phienKhachId = ketQua.phienKhach.id;
        if (ketQua.token) { res.cookie(TEN_COOKIE, ketQua.token, COOKIE_CONFIG.guestTokenOptions); }
        return next();
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    damBaoPhienKhach
};