'use strict';

const backendClient = require('../../../core/api/backend-client');
const sessionService = require('../../../core/auth/session.service');
const authService = require('../../auth/auth.service');

const LOAI_TAI_KHOAN = Object.freeze({
    NGUOI_DUNG: 'Người dùng',
    QUAN_TRI: 'Quản trị',
    HE_THONG: 'Hệ thống'
});

const TRANG_THAI = Object.freeze({
    HOAT_DONG: 'Hoạt động',
    TAM_KHOA: 'Tạm khóa',
    VO_HIEU_HOA: 'Vô hiệu hóa'
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

function mapNguoiDung(nguoiDung) {
    if (!nguoiDung) { return null; }
    return {
        ...nguoiDung,
        loaiTaiKhoanHienThi: LOAI_TAI_KHOAN[nguoiDung.loaiTaiKhoan] || nguoiDung.loaiTaiKhoan || '-',
        trangThaiHienThi: TRANG_THAI[nguoiDung.trangThai] || nguoiDung.trangThai || '-',
        emailDaXacThuc: Boolean(nguoiDung.emailXacThucLuc),
        emailXacThucLucHienThi: dinhDangNgay(nguoiDung.emailXacThucLuc),
        lanDangNhapCuoiLucHienThi: dinhDangNgay(nguoiDung.lanDangNhapCuoiLuc),
        createdAtHienThi: dinhDangNgay(nguoiDung.createdAt),
        updatedAtHienThi: dinhDangNgay(nguoiDung.updatedAt)
    };
}

async function layThongTin(req) {
    const payload = await backendClient.get('/nguoi-dung/hien-tai', taoAuthOptions(req));
    return mapNguoiDung(payload.data);
}

async function capNhatThongTin(req, values) {
    const payload = await backendClient.patch('/nguoi-dung/hien-tai', {
        tenDangNhap: values.tenDangNhap || null,
        hoTen: values.hoTen
    }, taoAuthOptions(req));
    const nguoiDung = payload.data;
    const auth = sessionService.layAuth(req);
    if (auth?.accessToken) {
        await sessionService.capNhatDangNhap(req, {
            nguoiDung,
            accessToken: auth.accessToken,
            accessTokenExpiresAt: auth.accessTokenExpiresAt || null
        });
    }
    return mapNguoiDung(nguoiDung);
}

async function doiMatKhau(req, values) {
    await authService.doiMatKhau(req, values);
    return true;
}

module.exports = {
    layThongTin,
    capNhatThongTin,
    doiMatKhau
};