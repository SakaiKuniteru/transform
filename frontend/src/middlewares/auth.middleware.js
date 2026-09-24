'use strict';
const backendClient = require('../core/api/backend-client');
const { ApiError } = require('../core/api/api-error');
const { chuanHoaApiResponse, laThatBai } = require('../core/api/api-response');
const authContext = require('../core/auth/auth-context');
const sessionService = require('../core/auth/session.service');

function layDuLieuToken(response) {
    const payload = chuanHoaApiResponse(response.data);
    if (laThatBai(payload)) { throw ApiError.tuResponse(response); }
    if (!payload.data?.nguoiDung?.id || !payload.data?.accessToken) { throw new ApiError('Backend không trả về dữ liệu phiên hợp lệ.', { statusCode: 502, code: 'BACKEND_AUTH_RESPONSE_KHONG_HOP_LE', requestId: response.headers?.['x-request-id'] || null }); }
    return payload.data;
}

async function lamMoiPhien(req) {
    const cookie = sessionService.layCookieBackend(req);
    if (!cookie) { return false; }
    const response = await backendClient.thucThiRaw({ method: 'POST', url: '/xac-thuc/lam-moi-token', cookie, requestId: req.requestId || null });
    await sessionService.capNhatDangNhap(req, layDuLieuToken(response), response.headers);
    return true;
}

function canLamMoiPhien(req) {
    if (!sessionService.daDangNhap(req) || !sessionService.coTheLamMoi(req)) { return false; }
    return sessionService.accessTokenSapHetHan(req);
}

function laLoiPhienHetHan(error) { return error?.statusCode === 401 || error?.statusCode === 403; }

async function dongBoPhien(req) {
    if (!canLamMoiPhien(req)) { return false; }
    try { return await lamMoiPhien(req); } catch (error) { if (!laLoiPhienHetHan(error)) { throw error; } await sessionService.xoaDangNhap(req); return false; }
}

async function authMiddleware(req, res, next) {
    try { await dongBoPhien(req); authContext.ganAuthContext(req, res); return next(); } catch (error) { return next(error); }
}

function yeuCauDangNhap(req, res, next) {
    const context = req.authContext || authContext.ganAuthContext(req, res);
    if (context.daDangNhap) { return next(); }
    const error = new Error('Bạn cần đăng nhập để tiếp tục.');
    error.statusCode = 401;
    error.code = 'YEU_CAU_DANG_NHAP';
    error.expose = true;
    return next(error);
}

module.exports = {
    authMiddleware,
    yeuCauDangNhap,
    dongBoPhien,
    lamMoiPhien
};