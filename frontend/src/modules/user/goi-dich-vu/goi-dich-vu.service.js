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

const CHU_KY = Object.freeze({
    THANG: 'Tháng',
    NAM: 'Năm',
    MOT_LAN: 'Một lần'
});

const HAN_MUC = Object.freeze({
    UPLOAD_TONG_SO_LAN: 'Số lần tải lên',
    UPLOAD_TONG_SO_TEP: 'Tổng số tệp tải lên',
    UPLOAD_SO_TEP_MOI_LAN: 'Số tệp mỗi lần tải',
    UPLOAD_KICH_THUOC_MOI_TEP: 'Kích thước tối đa mỗi tệp'
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

function dinhDangByte(value) {
    const bytes = Number(value || 0);
    if (!Number.isFinite(bytes) || bytes <= 0) { return '0 B'; }
    const donVi = [ 'B', 'KB', 'MB', 'GB', 'TB' ];
    const bac = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), donVi.length - 1);
    const giaTri = bytes / (1024 ** bac);
    return `${giaTri >= 10 || bac === 0 ? giaTri.toFixed(0) : giaTri.toFixed(1)} ${donVi[bac]}`;
}

function dinhDangSoLuong(value, donVi) {
    if (value === null || value === undefined) { return '-'; }
    if (donVi === 'BYTE') { return dinhDangByte(value); }
    const hauTo = donVi === 'TEP' ? ' tệp' : donVi === 'LAN' ? ' lần' : '';
    return `${Number(value).toLocaleString('vi-VN')}${hauTo}`;
}

function mapGoi(goi) {
    if (!goi) { return null; }
    return {
        ...goi,
        giaHienThi: dinhDangGia(goi.gia, goi.tienTe),
        chuKyHienThi: CHU_KY[goi.chuKy] || goi.chuKy || '-',
        chuKyDayDuHienThi: goi.chuKy === 'MOT_LAN' ? 'Một lần' : `${goi.soChuKy || 1} ${String(CHU_KY[goi.chuKy] || goi.chuKy || '').toLowerCase()}`
    };
}

function mapDangKy(dangKy) {
    if (!dangKy) { return null; }
    return {
        ...dangKy,
        goiDichVu: mapGoi(dangKy.goiDichVu),
        trangThaiHienThi: TRANG_THAI[dangKy.trangThai] || dangKy.trangThai || '-',
        nguonKichHoatHienThi: NGUON_KICH_HOAT[dangKy.nguonKichHoat] || dangKy.nguonKichHoat || '-',
        giaThanhToanHienThi: dinhDangGia(dangKy.giaThanhToan, dangKy.tienTe),
        batDauLucHienThi: dinhDangNgay(dangKy.batDauLuc),
        hetHanLucHienThi: dinhDangNgay(dangKy.hetHanLuc),
        huyLucHienThi: dinhDangNgay(dangKy.huyLuc),
        createdAtHienThi: dinhDangNgay(dangKy.createdAt),
        coTheHuy: [ 'CHO_THANH_TOAN', 'HOAT_DONG', 'TAM_DUNG' ].includes(dangKy.trangThai)
    };
}

function mapHanMuc(item) {
    const gioiHan = item.khongGioiHan ? 'Không giới hạn' : dinhDangSoLuong(item.gioiHan, item.donVi);
    const daSuDung = item.khongGioiHan ? dinhDangSoLuong(item.daSuDung, item.donVi) : dinhDangSoLuong(item.daSuDung || 0, item.donVi);
    const conLai = item.khongGioiHan ? 'Không giới hạn' : dinhDangSoLuong(item.conLai, item.donVi);
    const gioiHanSo = Number(item.gioiHan);
    const daSuDungSo = Number(item.daSuDung || 0);
    const phanTram = !item.khongGioiHan && Number.isFinite(gioiHanSo) && gioiHanSo > 0 ? Math.min(100, Math.max(0, Math.round((daSuDungSo / gioiHanSo) * 100))) : null;
    return {
        ...item,
        tenHienThi: HAN_MUC[item.maHanhDong] || item.tenChinhSach || item.maHanhDong,
        gioiHanHienThi: gioiHan,
        daSuDungHienThi: daSuDung,
        conLaiHienThi: conLai,
        phanTram,
        kyBatDauHienThi: dinhDangNgay(item.kyBatDau),
        kyKetThucHienThi: dinhDangNgay(item.kyKetThuc)
    };
}

async function layHienTai(req) {
    const payload = await backendClient.get('/dang-ky-goi/hien-tai', taoAuthOptions(req));
    return mapDangKy(payload.data);
}

async function layLichSu(req, query = {}) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 10)));
    const trangThai = String(query.trangThai || '').trim() || undefined;
    const payload = await backendClient.get('/dang-ky-goi/cua-toi', taoAuthOptions(req, {
        params: {
            page,
            limit,
            trangThai
        }
    }));
    return {
        danhSach: (payload.data || []).map(mapDangKy),
        phanTrang: {
            page: Number(payload.meta?.page || page),
            limit: Number(payload.meta?.limit || limit),
            total: Number(payload.meta?.total || 0),
            totalPages: Math.max(1, Number(payload.meta?.totalPages || 1))
        }
    };
}

async function layHanMuc(req) {
    const payload = await backendClient.get('/han-muc/cua-toi', taoAuthOptions(req));
    const data = payload.data || {};
    return {
        ...data,
        goiDichVu: mapGoi(data.goiDichVu),
        dangKyGoi: mapDangKy(data.dangKyGoi),
        danhSachHanMuc: Object.values(data.hanMuc || {}).map(mapHanMuc)
    };
}

async function layTrang(req, query = {}) {
    const [ hienTai, lichSu, hanMuc ] = await Promise.all([
        layHienTai(req),
        layLichSu(req, query),
        layHanMuc(req)
    ]);
    return {
        hienTai,
        lichSu,
        hanMuc
    };
}

async function huy(req, id, values = {}) {
    const lyDo = String(values.lyDo || '').trim() || null;
    const payload = await backendClient.patch(`/dang-ky-goi/cua-toi/${id}/huy`, {
        lyDo
    }, taoAuthOptions(req));
    return mapDangKy(payload.data);
}

module.exports = {
    TRANG_THAI,
    layHienTai,
    layLichSu,
    layHanMuc,
    layTrang,
    huy
};