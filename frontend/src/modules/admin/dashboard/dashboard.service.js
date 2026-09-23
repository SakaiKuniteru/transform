'use strict';

const backendClient = require('../../../core/api/backend-client');
const sessionService = require('../../../core/auth/session.service');

const TRANG_THAI_DANG_KY = Object.freeze({
    CHO_THANH_TOAN: 'Chờ thanh toán',
    HOAT_DONG: 'Hoạt động',
    TAM_DUNG: 'Tạm dừng',
    HET_HAN: 'Hết hạn',
    DA_HUY: 'Đã hủy'
});

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
    return new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'Asia/Ho_Chi_Minh'
    }).format(ngay);
}

function dinhDangGia(value, tienTe = 'VND') {
    const so = Number(value || 0);
    try {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: tienTe || 'VND',
            maximumFractionDigits: tienTe === 'VND' ? 0 : 2
        }).format(so);
    } catch (error) { return `${so.toLocaleString('vi-VN')} ${tienTe || ''}`.trim(); }
}

function layTong(payload) { return Number(payload?.meta?.total || 0); }

function mapNguoiDung(nguoiDung) {
    return {
        ...nguoiDung,
        createdAtHienThi: dinhDangNgay(nguoiDung.createdAt),
        lanDangNhapCuoiLucHienThi: dinhDangNgay(nguoiDung.lanDangNhapCuoiLuc)
    };
}

function mapDangKy(dangKy) {
    return {
        ...dangKy,
        trangThaiHienThi: TRANG_THAI_DANG_KY[dangKy.trangThai] || dangKy.trangThai || '-',
        giaThanhToanHienThi: dinhDangGia(dangKy.giaThanhToan, dangKy.tienTe),
        createdAtHienThi: dinhDangNgay(dangKy.createdAt)
    };
}

async function layDashboard(req) {
    const [ nguoiDung, nguoiDungHoatDong, quanTri, goiDichVu, goiDichVuHoatDong, dangKy, dangKyHoatDong, dangKyChoThanhToan, health ] = await Promise.all([
        backendClient.get('/nguoi-dung', taoAuthOptions(req, { params: { page: 1, pageSize: 5 } })),
        backendClient.get('/nguoi-dung', taoAuthOptions(req, { params: { page: 1, pageSize: 1, trangThai: 'HOAT_DONG' } })),
        backendClient.get('/nguoi-dung', taoAuthOptions(req, { params: { page: 1, pageSize: 1, loaiTaiKhoan: 'QUAN_TRI' } })),
        backendClient.get('/goi-dich-vu', taoAuthOptions(req, { params: { page: 1, limit: 1 } })),
        backendClient.get('/goi-dich-vu', taoAuthOptions(req, { params: { page: 1, limit: 1, active: true } })),
        backendClient.get('/dang-ky-goi', taoAuthOptions(req, { params: { page: 1, limit: 5 } })),
        backendClient.get('/dang-ky-goi', taoAuthOptions(req, { params: { page: 1, limit: 1, trangThai: 'HOAT_DONG' } })),
        backendClient.get('/dang-ky-goi', taoAuthOptions(req, { params: { page: 1, limit: 1, trangThai: 'CHO_THANH_TOAN' } })),
        backendClient.get('/health', { requestId: req.requestId || null })
    ]);
    return {
        thongKe: {
            tongNguoiDung: layTong(nguoiDung),
            nguoiDungHoatDong: layTong(nguoiDungHoatDong),
            tongQuanTri: layTong(quanTri),
            tongGoiDichVu: layTong(goiDichVu),
            goiDichVuHoatDong: layTong(goiDichVuHoatDong),
            tongDangKy: layTong(dangKy),
            dangKyHoatDong: layTong(dangKyHoatDong),
            choThanhToan: layTong(dangKyChoThanhToan)
        },
        nguoiDungGanDay: (nguoiDung.data || []).map(mapNguoiDung),
        dangKyGanDay: (dangKy.data || []).map(mapDangKy),
        heThong: {
            status: health.data?.status || 'UNKNOWN',
            service: health.data?.service || 'Transform Backend',
            version: health.data?.version || '-',
            uptimeSeconds: Number(health.data?.uptimeSeconds || 0),
            timestampHienThi: dinhDangNgay(health.data?.timestamp)
        }
    };
}

module.exports = {
    layDashboard
};