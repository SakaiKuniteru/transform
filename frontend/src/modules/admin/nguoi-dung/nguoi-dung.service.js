'use strict';

const backendClient = require('../../../core/api/backend-client');
const sessionService = require('../../../core/auth/session.service');

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

const LOAI_TAI_KHOAN_OPTIONS = Object.freeze([
    Object.freeze({
        value: 'NGUOI_DUNG',
        label: 'Người dùng'
    }),
    Object.freeze({
        value: 'QUAN_TRI',
        label: 'Quản trị'
    })
]);

const TRANG_THAI_OPTIONS = Object.freeze([
    Object.freeze({
        value: 'HOAT_DONG',
        label: 'Hoạt động'
    }),
    Object.freeze({
        value: 'TAM_KHOA',
        label: 'Tạm khóa'
    }),
    Object.freeze({
        value: 'VO_HIEU_HOA',
        label: 'Vô hiệu hóa'
    })
]);

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

function chuanHoaTrang(value, macDinh = 1) {
    const so = Number(value);
    return Number.isSafeInteger(so) && so > 0 ? so : macDinh;
}

function chuanHoaQuery(query = {}) {
    return {
        page: chuanHoaTrang(query.page),
        pageSize: Math.min(100, chuanHoaTrang(query.pageSize, 20)),
        tuKhoa: String(query.tuKhoa || query.q || '').trim(),
        loaiTaiKhoan: String(query.loaiTaiKhoan || '').trim() || undefined,
        trangThai: String(query.trangThai || '').trim() || undefined
    };
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
        updatedAtHienThi: dinhDangNgay(nguoiDung.updatedAt),
        laHeThong: nguoiDung.loaiTaiKhoan === 'HE_THONG'
    };
}

async function dongBoNguoiDungHienTai(req, nguoiDung) {
    const hienTai = sessionService.layNguoiDung(req);
    const auth = sessionService.layAuth(req);
    if (!hienTai || !auth?.accessToken || Number(hienTai.id) !== Number(nguoiDung.id)) { return; }
    await sessionService.capNhatDangNhap(req, {
        nguoiDung,
        accessToken: auth.accessToken,
        accessTokenExpiresAt: auth.accessTokenExpiresAt || null
    });
}

async function layDanhSach(req, query = {}) {
    const params = chuanHoaQuery(query);
    const payload = await backendClient.get('/nguoi-dung', taoAuthOptions(req, {
        params
    }));
    return {
        danhSach: (payload.data || []).map(mapNguoiDung),
        phanTrang: {
            page: Number(payload.meta?.page || params.page),
            pageSize: Number(payload.meta?.pageSize || params.pageSize),
            total: Number(payload.meta?.total || 0),
            totalPages: Number(payload.meta?.totalPages || 0)
        }
    };
}

async function layChiTiet(req, id) {
    const payload = await backendClient.get(`/nguoi-dung/${id}`, taoAuthOptions(req));
    return mapNguoiDung(payload.data);
}

async function taoMoi(req, values) {
    const payload = await backendClient.post('/nguoi-dung', {
        email: values.email,
        tenDangNhap: values.tenDangNhap || null,
        hoTen: values.hoTen,
        matKhau: values.matKhau,
        loaiTaiKhoan: values.loaiTaiKhoan,
        trangThai: values.trangThai,
        emailDaXacThuc: values.emailDaXacThuc === true
    }, taoAuthOptions(req));
    return mapNguoiDung(payload.data);
}

async function capNhat(req, id, values) {
    const payload = await backendClient.patch(`/nguoi-dung/${id}`, {
        email: values.email,
        tenDangNhap: values.tenDangNhap || null,
        hoTen: values.hoTen,
        loaiTaiKhoan: values.loaiTaiKhoan
    }, taoAuthOptions(req));
    await dongBoNguoiDungHienTai(req, payload.data);
    return mapNguoiDung(payload.data);
}

async function capNhatTrangThai(req, id, trangThai) {
    const payload = await backendClient.patch(`/nguoi-dung/${id}/trang-thai`, {
        trangThai
    }, taoAuthOptions(req));
    await dongBoNguoiDungHienTai(req, payload.data);
    return mapNguoiDung(payload.data);
}

async function xoa(req, id) {
    const payload = await backendClient.delete(`/nguoi-dung/${id}`, taoAuthOptions(req));
    return mapNguoiDung(payload.data);
}

function laTrangThaiHopLe(value) { return TRANG_THAI_OPTIONS.some((item) => item.value === value); }

module.exports = {
    LOAI_TAI_KHOAN,
    TRANG_THAI,
    LOAI_TAI_KHOAN_OPTIONS,
    TRANG_THAI_OPTIONS,
    chuanHoaQuery,
    mapNguoiDung,
    layDanhSach,
    layChiTiet,
    taoMoi,
    capNhat,
    capNhatTrangThai,
    xoa,
    laTrangThaiHopLe
};