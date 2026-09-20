'use strict';

const { apiResponse } = require('@transform/shared');
const { COOKIE_CONFIG } = require('../../config/security');
const service = require('./xac-thuc.service');
const TEN_COOKIE_REFRESH = COOKIE_CONFIG?.refreshTokenName || 'transform_refresh_token';

function layValidated(req, viTri = 'body') {
    return req.validated?.[viTri] ?? req[viTri] ?? {};
}

function layRefreshToken(req) {
    return req.signedCookies?.[TEN_COOKIE_REFRESH] || req.cookies?.[TEN_COOKIE_REFRESH] || null;
}

function taoTuyChonCookie() {
    return {
        ...COOKIE_CONFIG.refreshTokenOptions
    };
}

function ganRefreshToken(res, refreshToken, hetHanLuc) {
    const options = taoTuyChonCookie();
    options.maxAge = Math.max(0, new Date(hetHanLuc).getTime() - Date.now());
    res.cookie(
        TEN_COOKIE_REFRESH,
        refreshToken,
        options
    );
}

function xoaRefreshToken(res) {
    res.clearCookie(TEN_COOKIE_REFRESH, taoTuyChonCookie());
}

function taoContext(req) {
    return {
        requestId: req.requestId || null,
        diaChiIp: req.ip || null,
        userAgent: req.get('user-agent') || null
    };
}

function taoDuLieuToken(ketQua) {
    return {
        nguoiDung: ketQua.nguoiDung,
        accessToken: ketQua.accessToken,
        accessTokenExpiresAt: ketQua.accessTokenExpiresAt
    };
}

async function dangKy(req, res) {
    const ketQua = await service.dangKy(
        layValidated(req),
        taoContext(req)
    );
    const data = {
        nguoiDung: ketQua.nguoiDung,
        otpHetHanLuc: ketQua.hetHanLuc
    };
    if (ketQua.maOtpDevelopment) { data.maOtpDevelopment = ketQua.maOtpDevelopment; }
    return res.status(201).json(apiResponse.taoThanhCong(data,
        {
            message: 'Đăng ký tài khoản thành công. Vui lòng xác thực email.'
        }
    ));
}

async function xacThucEmail(req, res) {
    const nguoiDung = await service.xacThucEmail(layValidated(req));
    return res.json(apiResponse.taoThanhCong(nguoiDung,
        {
            message: 'Xác thực email thành công.'
        }
    ));
}

async function guiLaiOtp(req, res) {
    const ketQua = await service.guiLaiOtpXacThucEmail(
        layValidated(req),
        taoContext(req)
    );
    const data = { daGui: true };
    if (ketQua.hetHanLuc) { data.otpHetHanLuc = ketQua.hetHanLuc; }
    if (ketQua.maOtpDevelopment) { data.maOtpDevelopment = ketQua.maOtpDevelopment; }
    return res.json(apiResponse.taoThanhCong(data,
        {
            message: 'Nếu tài khoản hợp lệ, mã xác thực đã được gửi.'
        }
    ));
}


async function dangNhap(req, res) {
    const ketQua = await service.dangNhap(
        layValidated(req),
        taoContext(req)
    );

    ganRefreshToken(
        res,
        ketQua.refreshToken,
        ketQua.refreshTokenExpiresAt
    );

    return res.json(apiResponse.taoThanhCong(taoDuLieuToken(ketQua),
        {
            message: 'Đăng nhập thành công.'
        }
    ));
}


async function lamMoiToken(req, res) {
    const ketQua = await service.lamMoiToken(
        layRefreshToken(req),
        taoContext(req)
    );
    ganRefreshToken(
        res,
        ketQua.refreshToken,
        ketQua.refreshTokenExpiresAt
    );
    return res.json(apiResponse.taoThanhCong(taoDuLieuToken(ketQua),
        {
            message: 'Làm mới token thành công.'
        }
    ));
}

async function dangXuat(req, res) {
    await service.dangXuat(layRefreshToken(req));
    xoaRefreshToken(res);
    return res.json(apiResponse.taoThanhCong(null,
        {
            message: 'Đăng xuất thành công.'
        }
    ));
}

async function dangXuatTatCa(req, res) {
    await service.dangXuatTatCa(req.user.id);
    xoaRefreshToken(res);
    return res.json(apiResponse.taoThanhCong(null,
        {
            message: 'Đã đăng xuất khỏi tất cả phiên.'
        }
    ));
}

async function quenMatKhau(req, res) {
    const ketQua = await service.quenMatKhau(layValidated(req), taoContext(req));
    const data = { daGui: true };
    if (ketQua.hetHanLuc) { data.otpHetHanLuc = ketQua.hetHanLuc; }
    if (ketQua.maOtpDevelopment) { data.maOtpDevelopment = ketQua.maOtpDevelopment; }
    return res.json(apiResponse.taoThanhCong(data,
        {
            message: 'Nếu email tồn tại, mã xác thực đã được gửi.'
        }
    ));
}

async function xacThucOtpDatLaiMatKhau(req, res) {
    const ketQua = await service.xacThucOtpDatLaiMatKhau(layValidated(req));
    return res.json(apiResponse.taoThanhCong(ketQua,
        {
            message: 'Xác thực mã đặt lại mật khẩu thành công.'
        }
    ));
}

async function datLaiMatKhau(req, res) {
    await service.datLaiMatKhau(layValidated(req));
    xoaRefreshToken(res);
    return res.json(apiResponse.taoThanhCong(null,
        {
            message: 'Đặt lại mật khẩu thành công.'
        }
    ));
}

async function doiMatKhau(req, res) {
    await service.doiMatKhau(req.user.id, layValidated(req));
    xoaRefreshToken(res);
    return res.json(apiResponse.taoThanhCong(null,
        {
            message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.'
        }
    ));
}

module.exports = {
    dangKy,
    xacThucEmail,
    guiLaiOtp,
    dangNhap,
    lamMoiToken,
    dangXuat,
    dangXuatTatCa,
    quenMatKhau,
    xacThucOtpDatLaiMatKhau,
    datLaiMatKhau,
    doiMatKhau
};