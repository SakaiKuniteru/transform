'use strict';
const backendClient = require('../../../core/api/backend-client');
const sessionService = require('../../../core/auth/session.service');
const LEVEL_OPTIONS = Object.freeze([
    Object.freeze({ value: 'DEBUG', label: 'Debug' }),
    Object.freeze({ value: 'INFO', label: 'Info' }),
    Object.freeze({ value: 'WARN', label: 'Warning' }),
    Object.freeze({ value: 'ERROR', label: 'Error' }),
    Object.freeze({ value: 'SECURITY', label: 'Security' }),
    Object.freeze({ value: 'AUDIT', label: 'Audit' })
]);

function taoAuthOptions(req, options = {}) {
    return {
        ...options,
        accessToken: sessionService.layAccessToken(req),
        requestId: req.requestId || null
    };
}

function chuanHoaTrang(value, macDinh = 1) {
    const so = Number(value);
    return Number.isSafeInteger(so) && so > 0 ? so : macDinh;
}

function chuanHoaNgay(value, cuoiNgay = false) {
    const text = String(value || '').trim();
    if (!text) { return undefined; }
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) { return `${text}T${cuoiNgay ? '23:59:59.999' : '00:00:00.000'}+07:00`; }
    return text;
}

function dinhDangNgay(value) {
    if (!value) { return '-'; }
    const ngay = new Date(value);
    if (Number.isNaN(ngay.getTime())) { return '-'; }
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' }).format(ngay);
}

function chuanHoaQuery(query = {}) {
    return {
        requestId: String(query.requestId || '').trim() || undefined,
        traceId: String(query.traceId || '').trim() || undefined,
        congViecId: String(query.congViecId || '').trim() || undefined,
        nguoiDungId: String(query.nguoiDungId || '').trim() || undefined,
        event: String(query.event || '').trim() || undefined,
        level: String(query.level || '').trim().toUpperCase() || undefined,
        tuNgay: chuanHoaNgay(query.tuNgay),
        denNgay: chuanHoaNgay(query.denNgay, true),
        page: chuanHoaTrang(query.page),
        pageSize: Math.min(100, chuanHoaTrang(query.pageSize, 20))
    };
}

function mapNhatKy(item) {
    if (!item) { return null; }
    return {
        ...item,
        createdAtHienThi: dinhDangNgay(item.createdAt),
        chuTheHienThi: item.nguoiDungId ? `Người dùng #${item.nguoiDungId}` : item.phienKhachId ? `Phiên khách #${item.phienKhachId}` : 'Hệ thống',
        duLieuHienThi: item.duLieu && Object.keys(item.duLieu).length ? JSON.stringify(item.duLieu) : null
    };
}

async function layDanhSach(req, query = {}) {
    const params = chuanHoaQuery(query);
    const payload = await backendClient.get('/nhat-ky', taoAuthOptions(req, { params }));
    return {
        danhSach: (payload.data || []).map(mapNhatKy),
        phanTrang: {
            page: Number(payload.meta?.page || params.page),
            pageSize: Number(payload.meta?.pageSize || params.pageSize),
            total: Number(payload.meta?.total || 0),
            totalPages: Math.max(1, Number(payload.meta?.totalPages || 1))
        }
    };
}

async function layTheoRequestId(req, requestId) {
    const payload = await backendClient.get(`/nhat-ky/request/${encodeURIComponent(requestId)}`, taoAuthOptions(req));
    return (payload.data || []).map(mapNhatKy);
}

async function layTheoTraceId(req, traceId) {
    const payload = await backendClient.get(`/nhat-ky/trace/${encodeURIComponent(traceId)}`, taoAuthOptions(req));
    return (payload.data || []).map(mapNhatKy);
}

async function layTheoCongViec(req, congViecId) {
    const payload = await backendClient.get(`/nhat-ky/cong-viec/${congViecId}`, taoAuthOptions(req));
    return (payload.data || []).map(mapNhatKy);
}

module.exports = {
    LEVEL_OPTIONS,
    chuanHoaQuery,
    mapNhatKy,
    layDanhSach,
    layTheoRequestId,
    layTheoTraceId,
    layTheoCongViec
};