'use strict';

const backendClient = require('../../../core/api/backend-client');
const sessionService = require('../../../core/auth/session.service');

const CHU_KY = Object.freeze({
    THANG: 'Tháng',
    NAM: 'Năm',
    MOT_LAN: 'Một lần'
});

const CHU_KY_OPTIONS = Object.freeze([
    Object.freeze({
        value: 'THANG',
        label: 'Tháng'
    }),
    Object.freeze({
        value: 'NAM',
        label: 'Năm'
    }),
    Object.freeze({
        value: 'MOT_LAN',
        label: 'Một lần'
    })
]);

function taoAuthOptions(req, options = {}) {
    return {
        ...options,
        accessToken: sessionService.layAccessToken(req),
        requestId: req.requestId || null
    };
}

function chuanHoaBoolean(value) {
    if (value === true || value === 'true' || value === '1' || value === 'on') { return true; }
    if (value === false || value === 'false' || value === '0') { return false; }
    return undefined;
}

function chuanHoaSo(value, macDinh = null) {
    if (value === undefined || value === null || value === '') { return macDinh; }
    const so = Number(value);
    return Number.isFinite(so) ? so : macDinh;
}

function dinhDangNgay(value) {
    if (!value) { return '-'; }
    const ngay = new Date(value);
    if (Number.isNaN(ngay.getTime())) { return '-'; }
    return new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'Asia/Ho_Chi_Minh'
    }).format(ngay);
}

function dinhDangGia(value, tienTe = 'VND') {
    const so = Number(value || 0);
    try { return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: tienTe || 'VND', maximumFractionDigits: tienTe === 'VND' ? 0 : 2 }).format(so); } catch (error) { return `${so.toLocaleString('vi-VN')} ${tienTe || ''}`.trim(); }
}

function chuanHoaQuery(query = {}) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
    return {
        tuKhoa: String(query.tuKhoa || query.q || '').trim(),
        active: chuanHoaBoolean(query.active),
        chuKy: String(query.chuKy || '').trim() || undefined,
        yeuCauThanhToan: chuanHoaBoolean(query.yeuCauThanhToan),
        page,
        limit,
        sortBy: String(query.sortBy || 'thuTu'),
        sortOrder: String(query.sortOrder || 'asc').toLowerCase()
    };
}

function mapGoi(goi) {
    if (!goi) { return null; }
    return {
        ...goi,
        giaHienThi: dinhDangGia(goi.gia, goi.tienTe),
        chuKyHienThi: CHU_KY[goi.chuKy] || goi.chuKy || '-',
        chuKyDayDuHienThi: goi.chuKy === 'MOT_LAN' ? 'Một lần' : `${goi.soChuKy || 1} ${String(CHU_KY[goi.chuKy] || goi.chuKy || '').toLowerCase()}`,
        trangThaiHienThi: goi.active ? 'Đang hoạt động' : 'Ngừng hoạt động',
        createdAtHienThi: dinhDangNgay(goi.createdAt),
        updatedAtHienThi: dinhDangNgay(goi.updatedAt)
    };
}

function chuanHoaDuLieu(values = {}) {
    const yeuCauThanhToan = chuanHoaBoolean(values.yeuCauThanhToan) === true;
    const chuKy = String(values.chuKy || 'THANG').trim().toUpperCase();
    return {
        ma: String(values.ma || '').trim().toUpperCase(),
        ten: String(values.ten || '').trim(),
        moTa: String(values.moTa || '').trim() || null,
        gia: yeuCauThanhToan ? chuanHoaSo(values.gia, 0) : 0,
        tienTe: String(values.tienTe || 'VND').trim().toUpperCase(),
        yeuCauThanhToan,
        chuKy,
        soChuKy: chuKy === 'MOT_LAN' ? 1 : Math.max(1, Number(values.soChuKy || 1)),
        thuTu: Math.max(0, Number(values.thuTu || 0)),
        active: chuanHoaBoolean(values.active) === true
    };
}

async function layDanhSach(req, query = {}) {
    const params = chuanHoaQuery(query);
    const payload = await backendClient.get('/goi-dich-vu', taoAuthOptions(req, {
        params
    }));
    return {
        danhSach: (payload.data || []).map(mapGoi),
        phanTrang: {
            page: Number(payload.meta?.page || params.page),
            limit: Number(payload.meta?.limit || params.limit),
            total: Number(payload.meta?.total || 0),
            totalPages: Math.max(1, Number(payload.meta?.totalPages || 1))
        }
    };
}

async function layChiTiet(req, id) {
    const payload = await backendClient.get(`/goi-dich-vu/${id}`, taoAuthOptions(req));
    return mapGoi(payload.data);
}

async function taoMoi(req, values) {
    const payload = await backendClient.post('/goi-dich-vu', chuanHoaDuLieu(values), taoAuthOptions(req));
    return mapGoi(payload.data);
}

async function capNhat(req, id, values) {
    const payload = await backendClient.patch(`/goi-dich-vu/${id}`, chuanHoaDuLieu(values), taoAuthOptions(req));
    return mapGoi(payload.data);
}

async function capNhatTrangThai(req, id, active) {
    const payload = await backendClient.patch(`/goi-dich-vu/${id}/trang-thai`, {
        active: active === true
    }, taoAuthOptions(req));
    return mapGoi(payload.data);
}

async function xoa(req, id) {
    await backendClient.delete(`/goi-dich-vu/${id}`, taoAuthOptions(req));
    return true;
}

module.exports = {
    CHU_KY,
    CHU_KY_OPTIONS,
    chuanHoaQuery,
    mapGoi,
    chuanHoaDuLieu,
    layDanhSach,
    layChiTiet,
    taoMoi,
    capNhat,
    capNhatTrangThai,
    xoa
};