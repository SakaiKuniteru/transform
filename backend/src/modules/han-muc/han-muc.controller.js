'use strict';

const service = require('./han-muc.service');

function thanhCong(res, { statusCode = 200, message = null, data = null } = {}) {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        error: null
    });
}

async function getCuaToi(req, res, next) {
    try {
        const data = await service.getTongQuanNguoiDung(req.user.id);
        return thanhCong(res, { data });
    } catch (error) {
        return next(error);
    }
}

async function getChiTietCuaToi(req, res, next) {
    try {
        const data = await service.getChiTietHanMucNguoiDung(req.user.id, req.params.maHanhDong);
        return thanhCong(res, { data });
    } catch (error) {
        return next(error);
    }
}

async function getNguoiDung(req, res, next) {
    try {
        const data = await service.getTongQuanNguoiDung(req.params.nguoiDungId);
        return thanhCong(res, { data });
    } catch (error) {
        return next(error);
    }
}

async function getChiTietNguoiDung(req, res, next) {
    try {
        const data = await service.getChiTietHanMucNguoiDung(req.params.nguoiDungId, req.params.maHanhDong);
        return thanhCong(res, { data });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    getCuaToi,
    getChiTietCuaToi,
    getNguoiDung,
    getChiTietNguoiDung
};