'use strict';

const { apiResponse } = require('@transform/shared');
const env = require('../config/env');
const MA_LOI = require('../constants/ma-loi');
const { chuanHoaLoi } = require('../utils/loi');

function chuanHoaStatusCode(statusCode) {
    const giaTri = Number(statusCode);
    if (!Number.isInteger(giaTri) || giaTri < 400 || giaTri > 599) { return 500; }
    return giaTri;
}

function layThongTinLoiAnToan(error) {
    if (!error) { return null; }
    return {
        name: error.name || null,
        message: error.message || null,
        code: error.code || null,
        stack: error.stack || null
    };
}

function ghiLogLoi(req, loi, error) {
    const thongTin = {
        method: req?.method || null,
        path: req?.originalUrl || req?.url || null,
        statusCode: loi.statusCode,
        maLoi: loi.maLoi,
        loi: layThongTinLoiAnToan(error)
    };
    if (loi.statusCode >= 500) {
        console.error('Backend error:', thongTin);
        return;
    }
    if (env.laDevelopment) { console.warn('Backend request error:', thongTin); }
}

function taoResponseLoi(loi) {
    const duocPhepHienThi = loi.expose !== false || !env.laProduction;
    const response = apiResponse.taoThatBai({
        message: duocPhepHienThi ? loi.message : 'Hệ thống đang xảy ra lỗi.',
        code: duocPhepHienThi ? loi.maLoi : MA_LOI.LOI_HE_THONG,
        details: duocPhepHienThi ? loi.chiTiet : null,
        data: null
    });
    response.meta = duocPhepHienThi ? loi.metadata : null;
    return response;
}

function xuLyLoi(error, req, res, next) {
    if (res.headersSent) { return next(error); }
    const loi = chuanHoaLoi(error);
    const statusCode = chuanHoaStatusCode(loi.statusCode);
    loi.statusCode = statusCode;
    ghiLogLoi(req, loi, error);
    return res.status(statusCode).json(taoResponseLoi(loi));
}

module.exports = xuLyLoi;