'use strict';

const MA_LOI = require('../constants/ma-loi');
const { loiChuaXacThuc } = require('../utils/loi');
const xacThucService = require('../modules/xac-thuc/xac-thuc.service');


function layBearerToken(req) {
    const authorization = req.get('authorization');

    if (!authorization) { return null; }

    const match = authorization.match(/^Bearer\s+(.+)$/i);

    if (!match?.[1]) {
        throw loiChuaXacThuc(
            'Authorization header không hợp lệ.',
            MA_LOI.TOKEN_KHONG_HOP_LE
        );
    }

    return match[1].trim();
}


async function xuLyXacThuc(req, batBuoc) {
    const token = layBearerToken(req);

    if (!token) {
        if (!batBuoc) { return false; }

        throw loiChuaXacThuc(
            'Bạn cần đăng nhập để thực hiện thao tác này.',
            MA_LOI.CHUA_XAC_THUC
        );
    }

    const ketQua = await xacThucService.xacThucAccessToken(
        token
    );

    req.user = ketQua.user;
    req.auth = {
        ...ketQua.auth,
        accessToken: token
    };

    return true;
}


async function yeuCauXacThuc(req, res, next) {
    try {
        await xuLyXacThuc(req, true);
        return next();
    } catch (error) {
        return next(error);
    }
}


async function xacThucTuyChon(req, res, next) {
    try {
        await xuLyXacThuc(req, false);
        return next();
    } catch (error) {
        return next(error);
    }
}


module.exports = {
    layBearerToken,
    yeuCauXacThuc,
    xacThucTuyChon
};