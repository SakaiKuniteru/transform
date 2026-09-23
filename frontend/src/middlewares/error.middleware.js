'use strict';
const { apiResponse } = require('@transform/shared');
const appConfig = require('../config/app.config');
const { ApiError } = require('../core/api/api-error');
const { FormError } = require('../core/forms/form-error');
const { taoViewContext } = require('../core/views/view-context');
const VIEW_STATUS = new Set([ 400, 401, 403, 404, 429, 500, 503 ]);
const TIEU_DE = Object.freeze({ 400: 'Yêu cầu không hợp lệ', 401: 'Yêu cầu đăng nhập', 403: 'Không đủ quyền truy cập', 404: 'Không tìm thấy trang', 429: 'Quá nhiều yêu cầu', 500: 'Đã xảy ra lỗi', 503: 'Dịch vụ tạm thời không khả dụng' });

function chuanHoaStatusCode(error) {
    const statusCode = Number(error?.statusCode || error?.status || 500);
    return Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599 ? statusCode : 500;
}

function layViewStatus(statusCode) {
    if (VIEW_STATUS.has(statusCode)) { return statusCode; }
    if (statusCode >= 500) { return statusCode === 502 || statusCode === 504 ? 503 : 500; }
    return 400;
}

function layCode(error) { return error?.code || error?.maLoi || (chuanHoaStatusCode(error) >= 500 ? 'LOI_HE_THONG' : 'YEU_CAU_KHONG_HOP_LE'); }

function duocPhepHienThi(error, statusCode) { return statusCode < 500 || appConfig.environment !== 'production' || error?.expose === true; }

function layMessage(error, statusCode) {
    if (!duocPhepHienThi(error, statusCode)) { return 'Hệ thống đang xảy ra lỗi. Vui lòng thử lại sau.'; }
    return typeof error?.message === 'string' && error.message.trim() ? error.message.trim() : statusCode >= 500 ? 'Hệ thống đang xảy ra lỗi.' : 'Yêu cầu không hợp lệ.';
}

function layDetails(error) {
    if (error instanceof FormError) { return { fields: error.errors, global: error.globalErrors }; }
    return error instanceof ApiError ? error.details : error?.details || null;
}

function laYeuCauJson(req) {
    if (req.xhr || req.path?.startsWith('/api/')) { return true; }
    return req.accepts([ 'html', 'json' ]) === 'json';
}

function ghiLog(error, req, statusCode) {
    if (statusCode < 500) { if (appConfig.environment === 'development') { console.warn('Frontend request error:', { requestId: req.requestId || null, method: req.method, path: req.originalUrl || req.url, statusCode, code: layCode(error), message: error?.message || null }); } return; }
    console.error('Frontend error:', { requestId: req.requestId || null, method: req.method, path: req.originalUrl || req.url, statusCode, code: layCode(error), error });
}

function errorMiddleware(error, req, res, next) {
    if (res.headersSent) { return next(error); }
    const statusCode = chuanHoaStatusCode(error);
    const viewStatus = layViewStatus(statusCode);
    const message = layMessage(error, statusCode);
    const requestId = error?.requestId || req.requestId || null;
    ghiLog(error, req, statusCode);
    if (laYeuCauJson(req)) { return res.status(statusCode).json(apiResponse.taoThatBai({ message, code: layCode(error), details: duocPhepHienThi(error, statusCode) ? layDetails(error) : null, data: null })); }
    const data = taoViewContext(req, res, { layout: 'error', page: { title: `${TIEU_DE[viewStatus] || TIEU_DE[500]} | ${appConfig.name}`, noIndex: true }, statusCode, title: TIEU_DE[viewStatus] || TIEU_DE[500], message, requestId, action: { label: 'Về trang chủ', url: '/' } });
    return res.status(statusCode).render(`pages/errors/${viewStatus}`, data);
}

module.exports = {
    errorMiddleware,
    chuanHoaStatusCode,
    layViewStatus
};