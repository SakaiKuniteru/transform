'use strict';
const backendClient = require('../../../core/api/backend-client');
const sessionService = require('../../../core/auth/session.service');
const TRANG_THAI_OPTIONS = Object.freeze([
    Object.freeze({ value: 'HOAT_DONG', label: 'Hoạt động' }),
    Object.freeze({ value: 'HET_HAN', label: 'Hết hạn' }),
    Object.freeze({ value: 'DA_XOA', label: 'Đã xóa' })
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

function chuanHoaQuery(query = {}) {
    return {
        page: chuanHoaTrang(query.page),
        pageSize: Math.min(100, chuanHoaTrang(query.pageSize, 20)),
        tuKhoa: String(query.tuKhoa || query.q || '').trim(),
        nguoiDungId: String(query.nguoiDungId || '').trim() || undefined,
        trangThai: String(query.trangThai || '').trim() || undefined,
        dinhDang: String(query.dinhDang || '').trim() || undefined,
        tuNgay: chuanHoaNgay(query.tuNgay),
        denNgay: chuanHoaNgay(query.denNgay, true)
    };
}

function mapTep(tep) {
    if (!tep) { return null; }
    return {
        ...tep,
        chuSoHuuHienThi: tep.nguoiDungId ? `Người dùng #${tep.nguoiDungId}` : tep.phienKhachId ? `Phiên khách #${tep.phienKhachId}` : 'Không xác định',
        dinhDangHienThi: tep.phienBanHienTai?.dinhDang || tep.phienBanHienTai?.phanMoRong || '-',
        mimeTypeHienThi: tep.phienBanHienTai?.mimeType || '-',
        kichThuocHienThi: dinhDangKichThuoc(tep.phienBanHienTai?.kichThuocBytes),
        createdAtHienThi: dinhDangNgay(tep.createdAt),
        updatedAtHienThi: dinhDangNgay(tep.updatedAt),
        hetHanLucHienThi: dinhDangNgay(tep.hetHanLuc),
        coTheXoa: tep.trangThai !== 'DA_XOA' && !tep.xoaLuc
    };
}

async function layDanhSach(req, query = {}) {
    const params = chuanHoaQuery(query);
    const payload = await backendClient.get('/tep', taoAuthOptions(req, { params }));
    return {
        danhSach: (payload.data || []).map(mapTep),
        phanTrang: {
            page: Number(payload.meta?.page || params.page),
            pageSize: Number(payload.meta?.pageSize || params.pageSize),
            total: Number(payload.meta?.total || 0),
            totalPages: Math.max(1, Number(payload.meta?.totalPages || 1))
        }
    };
}

async function layChiTiet(req, id) {
    const payload = await backendClient.get(`/tep/${id}`, taoAuthOptions(req));
    return mapTep(payload.data);
}

async function xoa(req, id) {
    const payload = await backendClient.delete(`/tep/${id}`, taoAuthOptions(req));
    return payload.data;
}

module.exports = {
    TRANG_THAI_OPTIONS,
    chuanHoaQuery,
    mapTep,
    layDanhSach,
    layChiTiet,
    xoa
};