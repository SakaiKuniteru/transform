'use strict';
const backendClient = require('../../core/api/backend-client');
const { ApiError } = require('../../core/api/api-error');
const { chuanHoaApiResponse, laThatBai } = require('../../core/api/api-response');
const sessionService = require('../../core/auth/session.service');

function layPayload(response) {
    const payload = chuanHoaApiResponse(response.data);
    if (laThatBai(payload)) { throw ApiError.tuResponse(response); }
    return payload;
}

function layData(response) { return layPayload(response).data; }

function taoRequestOptions(req) { return { requestId: req?.requestId || null }; }

async function dangKy(req, values) {
    const payload = await backendClient.post('/xac-thuc/dang-ky', { email: values.email, tenDangNhap: values.tenDangNhap || null, hoTen: values.hoTen, matKhau: values.matKhau }, taoRequestOptions(req));
    return payload.data;
}

async function xacThucEmail(req, values) {
    const payload = await backendClient.post('/xac-thuc/xac-thuc-email', { email: values.email, maOtp: values.maOtp }, taoRequestOptions(req));
    return payload.data;
}

async function guiLaiOtp(req, values) {
    const payload = await backendClient.post('/xac-thuc/gui-lai-otp', { email: values.email }, taoRequestOptions(req));
    return payload.data;
}

async function dangNhap(req, values) {
    const response = await backendClient.thucThiRaw({ method: 'POST', url: '/xac-thuc/dang-nhap', data: { tenDangNhap: values.tenDangNhap, matKhau: values.matKhau }, requestId: req.requestId || null });
    const data = layData(response);
    await sessionService.luuDangNhap(req, data, response.headers);
    return data;
}

async function dangXuat(req) {
    const cookie = sessionService.layCookieBackend(req);
    try { if (cookie) { await backendClient.thucThiRaw({ method: 'POST', url: '/xac-thuc/dang-xuat', cookie, requestId: req.requestId || null }); } } catch (error) { console.warn('Không thể thu hồi phiên Backend khi đăng xuất:', error?.message || error); }
    await sessionService.xoaDangNhap(req);
    return true;
}

async function dangXuatTatCa(req) {
    const accessToken = sessionService.layAccessToken(req);
    const cookie = sessionService.layCookieBackend(req);
    const response = await backendClient.thucThiRaw({ method: 'POST', url: '/xac-thuc/dang-xuat-tat-ca', accessToken, cookie, requestId: req.requestId || null });
    layPayload(response);
    await sessionService.xoaDangNhap(req, response.headers);
    return true;
}

async function quenMatKhau(req, values) {
    const payload = await backendClient.post('/xac-thuc/quen-mat-khau', { email: values.email }, taoRequestOptions(req));
    return payload.data;
}

async function xacThucOtpDatLaiMatKhau(req, values) {
    const payload = await backendClient.post('/xac-thuc/xac-thuc-otp-dat-lai-mat-khau', { email: values.email, maOtp: values.maOtp }, taoRequestOptions(req));
    if (!payload.data?.resetToken) { throw new ApiError('Backend không trả về reset token hợp lệ.', { statusCode: 502, code: 'BACKEND_RESET_TOKEN_KHONG_HOP_LE' }); }
    return payload.data;
}

async function datLaiMatKhau(req, values) {
    const payload = await backendClient.post('/xac-thuc/dat-lai-mat-khau', { resetToken: values.resetToken, matKhauMoi: values.matKhauMoi }, taoRequestOptions(req));
    return payload.data;
}

async function doiMatKhau(req, values) {
    const accessToken = sessionService.layAccessToken(req);
    const cookie = sessionService.layCookieBackend(req);
    const response = await backendClient.thucThiRaw({ method: 'POST', url: '/xac-thuc/doi-mat-khau', data: { matKhauHienTai: values.matKhauHienTai, matKhauMoi: values.matKhauMoi }, accessToken, cookie, requestId: req.requestId || null });
    layPayload(response);
    await sessionService.xoaDangNhap(req, response.headers);
    return true;
}

module.exports = {
    dangKy,
    xacThucEmail,
    guiLaiOtp,
    dangNhap,
    dangXuat,
    dangXuatTatCa,
    quenMatKhau,
    xacThucOtpDatLaiMatKhau,
    datLaiMatKhau,
    doiMatKhau
};