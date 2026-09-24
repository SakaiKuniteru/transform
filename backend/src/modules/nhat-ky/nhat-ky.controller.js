'use strict';
const service = require('./nhat-ky.service');

function thanhCong(res, { statusCode = 200, message = null, data = null, meta = null } = {}) {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        meta,
        error: null
    });
}

async function getDanhSach(req, res, next) {
    try {
        const result = await service.getDanhSach(req.validated?.query || req.query);
        return thanhCong(res, {
            data: result.danhSach,
            meta: {
                page: result.phanTrang.page,
                pageSize: result.phanTrang.pageSize,
                total: result.phanTrang.tongSo,
                totalPages: result.phanTrang.tongTrang
            }
        });
    } catch (error) { return next(error); }
}

async function getTheoRequestId(req, res, next) {
    try {
        const data = await service.getTheoRequestId(req.params.requestId);
        return thanhCong(res, { data });
    } catch (error) { return next(error); }
}

async function getTheoTraceId(req, res, next) {
    try {
        const data = await service.getTheoTraceId(req.params.traceId);
        return thanhCong(res, { data });
    } catch (error) { return next(error); }
}

async function getTheoCongViec(req, res, next) {
    try {
        const data = await service.getTheoCongViec(req.params.congViecId);
        return thanhCong(res, { data });
    } catch (error) { return next(error); }
}

module.exports = {
    getDanhSach,
    getTheoRequestId,
    getTheoTraceId,
    getTheoCongViec
};