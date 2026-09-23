'use strict';
const backendClient = require('../../../core/api/backend-client');
const apiStream = require('../../../core/api/api-stream');
const sessionService = require('../../../core/auth/session.service');

function taoAuthOptions(req, options = {}) {
    return {
        ...options,
        accessToken: sessionService.layAccessToken(req),
        requestId: req.requestId || null
    };
}

function dinhDangNgay(value) {
    if (!value) { return '-'; }
    const ngay = new Date(value);
    if (Number.isNaN(ngay.getTime())) { return '-'; }
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(ngay);
}

function dinhDangKichThuoc(value) {
    const bytes = Number(value || 0);
    if (!Number.isFinite(bytes) || bytes <= 0) { return '0 B'; }
    const donVi = [ 'B', 'KB', 'MB', 'GB', 'TB' ];
    const bac = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), donVi.length - 1);
    const giaTri = bytes / (1024 ** bac);
    return `${giaTri >= 10 || bac === 0 ? giaTri.toFixed(0) : giaTri.toFixed(1)} ${donVi[bac]}`;
}

function mapTep(tep) {
    return {
        ...tep,
        dinhDangHienThi: String(tep.phienBanHienTai?.dinhDang || '-').toUpperCase(),
        mimeTypeHienThi: tep.phienBanHienTai?.mimeType || '-',
        kichThuocHienThi: dinhDangKichThuoc(tep.phienBanHienTai?.kichThuocBytes),
        createdAtHienThi: dinhDangNgay(tep.createdAt),
        updatedAtHienThi: dinhDangNgay(tep.updatedAt),
        hetHanLucHienThi: tep.hetHanLuc ? dinhDangNgay(tep.hetHanLuc) : null
    };
}

function chuanHoaQuery(query = {}) {
    const trang = Math.max(1, Number(query.page || query.trang || 1));
    const gioiHan = Math.min(100, Math.max(1, Number(query.pageSize || query.gioiHan || 20)));
    return {
        trang,
        gioiHan,
        tuKhoa: String(query.q || query.tuKhoa || '').trim(),
        trangThai: String(query.trangThai || '').trim() || undefined
    };
}

async function layDanhSach(req, query = {}) {
    const params = chuanHoaQuery(query);
    const payload = await backendClient.get('/tep/cua-toi', taoAuthOptions(req, { params }));
    const data = payload.data || {};
    return {
        danhSach: (data.danhSach || []).map(mapTep),
        phanTrang: data.phanTrang || { trang: 1, gioiHan: params.gioiHan, tongSo: 0, tongTrang: 1 }
    };
}

async function layChiTiet(req, id) {
    const payload = await backendClient.get(`/tep/${id}`, taoAuthOptions(req));
    return mapTep(payload.data);
}

async function upload(req) {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.toLowerCase().startsWith('multipart/form-data')) { throw new TypeError('Upload tệp yêu cầu multipart/form-data.'); }
    const headers = { 'Content-Type': contentType };
    if (req.headers['content-length']) { headers['Content-Length'] = req.headers['content-length']; }
    const payload = await backendClient.thucThi({ method: 'POST', url: '/tep/upload', data: req, headers, accessToken: sessionService.layAccessToken(req), requestId: req.requestId || null });
    return (payload.data || []).map(mapTep);
}

async function capNhat(req, id, values) {
    const payload = await backendClient.patch(`/tep/${id}`, { tenTep: values.tenTep, moTa: values.moTa || null }, taoAuthOptions(req));
    return mapTep(payload.data);
}

async function xoa(req, id) {
    const payload = await backendClient.delete(`/tep/${id}`, taoAuthOptions(req));
    return payload.data;
}

async function layTaiXuong(req, id) {
    return apiStream.layStream(taoAuthOptions(req, { method: 'GET', url: `/tep/${id}/tai-xuong` }));
}

module.exports = {
    layDanhSach,
    layChiTiet,
    upload,
    capNhat,
    xoa,
    layTaiXuong
};