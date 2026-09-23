'use strict';

const backendClient = require('../../../core/api/backend-client');
const sessionService = require('../../../core/auth/session.service');

const TRANG_THAI = Object.freeze({
    CHO_THANH_TOAN: 'Chờ thanh toán',
    HOAT_DONG: 'Hoạt động',
    TAM_DUNG: 'Tạm dừng',
    HET_HAN: 'Hết hạn',
    DA_HUY: 'Đã hủy'
});

const NGUON_KICH_HOAT = Object.freeze({
    THANH_TOAN: 'Thanh toán',
    QUAN_TRI: 'Quản trị',
    KHUYEN_MAI: 'Khuyến mại',
    HE_THONG: 'Hệ thống'
});

const TRANG_THAI_OPTIONS = Object.freeze(
    Object.entries(TRANG_THAI)
        .map(([ value, label ]) => Object.freeze({
            value,
            label
        }))
);

const NGUON_KICH_HOAT_OPTIONS = Object.freeze(
    Object.entries(NGUON_KICH_HOAT)
        .map(([ value, label ]) => Object.freeze({
            value,
            label
        }))
);

function taoAuthOptions(req, options = {}) {
    return {
        ...options,
        accessToken: sessionService.layAccessToken(req),
        requestId: req.requestId || null
    };
}

function chuanHoaId(value) {
    if (value === undefined || value === null || value === '') { return undefined; }
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

function chuanHoaNgay(value, cuoiNgay = false) {
    const text = String(value || '').trim();
    if (!text) { return undefined; }
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) { return `${text}T${cuoiNgay ? '23:59:59.999' : '00:00:00.000'}+07:00`; }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) { return `${text}:00+07:00`; }
    return text;
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
        nguoiDungId: chuanHoaId(query.nguoiDungId),
        goiDichVuId: chuanHoaId(query.goiDichVuId),
        trangThai: String(query.trangThai || '').trim() || undefined,
        nguonKichHoat: String(query.nguonKichHoat || '').trim() || undefined,
        tuKhoa: String(query.tuKhoa || query.q || '').trim(),
        tuNgay: chuanHoaNgay(query.tuNgay),
        denNgay: chuanHoaNgay(query.denNgay, true),
        page,
        limit,
        sortBy: String(query.sortBy || 'createdAt'),
        sortOrder: String(query.sortOrder || 'desc').toLowerCase()
    };
}

function mapDangKy(dangKy) {
    if (!dangKy) { return null; }
    return {
        ...dangKy,
        trangThaiHienThi: TRANG_THAI[dangKy.trangThai] || dangKy.trangThai || '-',
        nguonKichHoatHienThi: NGUON_KICH_HOAT[dangKy.nguonKichHoat] || dangKy.nguonKichHoat || '-',
        giaThanhToanHienThi: dinhDangGia(dangKy.giaThanhToan, dangKy.tienTe),
        batDauLucHienThi: dinhDangNgay(dangKy.batDauLuc),
        hetHanLucHienThi: dinhDangNgay(dangKy.hetHanLuc),
        huyLucHienThi: dinhDangNgay(dangKy.huyLuc),
        createdAtHienThi: dinhDangNgay(dangKy.createdAt),
        updatedAtHienThi: dinhDangNgay(dangKy.updatedAt),
        coTheKichHoat: dangKy.trangThai === 'CHO_THANH_TOAN',
        coTheTamDung: dangKy.trangThai === 'HOAT_DONG',
        coTheTiepTuc: dangKy.trangThai === 'TAM_DUNG',
        coTheHuy: [ 'CHO_THANH_TOAN', 'HOAT_DONG', 'TAM_DUNG' ].includes(dangKy.trangThai)
    };
}

async function layDanhSach(req, query = {}) {
    const params = chuanHoaQuery(query);
    const payload = await backendClient.get('/dang-ky-goi', taoAuthOptions(req, {
        params
    }));
    return {
        danhSach: (payload.data || []).map(mapDangKy),
        phanTrang: {
            page: Number(payload.meta?.page || params.page),
            limit: Number(payload.meta?.limit || params.limit),
            total: Number(payload.meta?.total || 0),
            totalPages: Math.max(1, Number(payload.meta?.totalPages || 1))
        }
    };
}

async function layChiTiet(req, id) {
    const payload = await backendClient.get(`/dang-ky-goi/${id}`, taoAuthOptions(req));
    return mapDangKy(payload.data);
}

async function layGoiOptions(req) {
    const payload = await backendClient.get('/goi-dich-vu', taoAuthOptions(req, {
        params: {
            page: 1,
            limit: 100,
            active: true,
            sortBy: 'thuTu',
            sortOrder: 'asc'
        }
    }));
    return (payload.data || []).map((goi) => ({
        value: goi.id,
        label: `${goi.ten} (${goi.ma})`
    }));
}

async function layNguoiDungOptions(req, tuKhoa = '') {
    const payload = await backendClient.get('/nguoi-dung', taoAuthOptions(req, {
        params: {
            page: 1,
            pageSize: 20,
            tuKhoa: String(tuKhoa || '').trim(),
            trangThai: 'HOAT_DONG'
        }
    }));
    return (payload.data || []).map((nguoiDung) => ({
        value: nguoiDung.id,
        label: `${nguoiDung.hoTen || nguoiDung.email} - ${nguoiDung.email}`
    }));
}

async function ganGoi(req, values = {}) {
    const payload = await backendClient.post('/dang-ky-goi/gan-goi', {
        nguoiDungId: chuanHoaId(values.nguoiDungId),
        goiDichVuId: chuanHoaId(values.goiDichVuId),
        batDauLuc: chuanHoaNgay(values.batDauLuc) || null,
        thayTheGoiHienTai: values.thayTheGoiHienTai === true
    }, taoAuthOptions(req));
    return mapDangKy(payload.data);
}

async function kichHoat(req, id, values = {}) {
    const payload = await backendClient.patch(`/dang-ky-goi/${id}/kich-hoat`, {
        maGiaoDich: String(values.maGiaoDich || '').trim() || null,
        batDauLuc: chuanHoaNgay(values.batDauLuc) || null,
        thayTheGoiHienTai: values.thayTheGoiHienTai === true
    }, taoAuthOptions(req));
    return mapDangKy(payload.data);
}

async function tamDung(req, id) {
    const payload = await backendClient.patch(`/dang-ky-goi/${id}/tam-dung`, {}, taoAuthOptions(req));
    return mapDangKy(payload.data);
}

async function tiepTuc(req, id) {
    const payload = await backendClient.patch(`/dang-ky-goi/${id}/tiep-tuc`, {}, taoAuthOptions(req));
    return mapDangKy(payload.data);
}

async function huy(req, id, values = {}) {
    const payload = await backendClient.patch(`/dang-ky-goi/${id}/huy`, {
        lyDo: String(values.lyDo || '').trim() || null
    }, taoAuthOptions(req));
    return mapDangKy(payload.data);
}

module.exports = {
    TRANG_THAI,
    NGUON_KICH_HOAT,
    TRANG_THAI_OPTIONS,
    NGUON_KICH_HOAT_OPTIONS,
    chuanHoaQuery,
    mapDangKy,
    layDanhSach,
    layChiTiet,
    layGoiOptions,
    layNguoiDungOptions,
    ganGoi,
    kichHoat,
    tamDung,
    tiepTuc,
    huy
};