'use strict';
const { trangThaiCongViec } = require('@transform/shared');
const backendClient = require('../../../core/api/backend-client');
const sessionService = require('../../../core/auth/session.service');
const TRANG_THAI_OPTIONS = Object.freeze(Object.values(trangThaiCongViec.THONG_TIN_TRANG_THAI).map((item) => Object.freeze({ value: item.ma, label: item.ten })));
const LOAI_CONG_VIEC_OPTIONS = Object.freeze([ Object.freeze({ value: 'CHUYEN_DOI', label: 'Chuyển đổi' }) ]);
const TRANG_THAI_BUOC = Object.freeze({ CHO_XU_LY: 'Chờ xử lý', DANG_XU_LY: 'Đang xử lý', HOAN_THANH: 'Hoàn thành', THAT_BAI: 'Thất bại', BO_QUA: 'Bỏ qua', DA_HUY: 'Đã hủy' });

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
        nguoiDungId: String(query.nguoiDungId || '').trim() || undefined,
        trangThai: String(query.trangThai || '').trim() || undefined,
        loaiCongViec: String(query.loaiCongViec || '').trim() || undefined,
        tuKhoa: String(query.tuKhoa || query.q || '').trim(),
        tuNgay: chuanHoaNgay(query.tuNgay),
        denNgay: chuanHoaNgay(query.denNgay, true)
    };
}

function mapBuoc(buoc) {
    return {
        ...buoc,
        trangThaiHienThi: TRANG_THAI_BUOC[buoc?.trangThai] || buoc?.trangThai || '-',
        batDauLucHienThi: dinhDangNgay(buoc?.batDauLuc),
        hoanThanhLucHienThi: dinhDangNgay(buoc?.hoanThanhLuc)
    };
}

function mapCongViec(congViec) {
    if (!congViec) { return null; }
    const thongTinTrangThai = trangThaiCongViec.layThongTinTrangThai(congViec.trangThai);
    const coTheHuy = Boolean(congViec.id && !trangThaiCongViec.laTrangThaiKetThuc(congViec.trangThai) && congViec.trangThai !== trangThaiCongViec.TRANG_THAI_CONG_VIEC.DANG_HUY);
    return {
        ...congViec,
        chuSoHuuHienThi: congViec.nguoiDungId ? `Người dùng #${congViec.nguoiDungId}` : congViec.phienKhachId ? `Phiên khách #${congViec.phienKhachId}` : 'Không xác định',
        loaiHienThi: congViec.loaiCongViec === 'CHUYEN_DOI' ? 'Chuyển đổi' : congViec.loaiCongViec || '-',
        trangThaiHienThi: thongTinTrangThai?.ten || congViec.trangThai || '-',
        coTheHuy,
        createdAtHienThi: dinhDangNgay(congViec.createdAt),
        updatedAtHienThi: dinhDangNgay(congViec.updatedAt),
        xepHangLucHienThi: dinhDangNgay(congViec.xepHangLuc),
        batDauLucHienThi: dinhDangNgay(congViec.batDauLuc),
        hoanThanhLucHienThi: dinhDangNgay(congViec.hoanThanhLuc),
        huyLucHienThi: dinhDangNgay(congViec.huyLuc),
        tepNguonKichThuocHienThi: dinhDangKichThuoc(congViec.phienBanNguon?.kichThuocBytes),
        tepKetQuaKichThuocHienThi: dinhDangKichThuoc(congViec.phienBanKetQua?.kichThuocBytes),
        cacBuoc: Array.isArray(congViec.cacBuoc) ? congViec.cacBuoc.map(mapBuoc) : []
    };
}

async function layDanhSach(req, query = {}) {
    const params = chuanHoaQuery(query);
    const payload = await backendClient.get('/cong-viec', taoAuthOptions(req, { params }));
    return {
        danhSach: (payload.data || []).map(mapCongViec),
        phanTrang: {
            page: Number(payload.meta?.page || params.page),
            pageSize: Number(payload.meta?.pageSize || params.pageSize),
            total: Number(payload.meta?.total || 0),
            totalPages: Math.max(1, Number(payload.meta?.totalPages || 1))
        }
    };
}

async function layChiTiet(req, id) {
    const payload = await backendClient.get(`/cong-viec/${id}`, taoAuthOptions(req));
    return mapCongViec(payload.data);
}

async function huy(req, id) {
    const payload = await backendClient.patch(`/cong-viec/${id}/huy`, null, taoAuthOptions(req));
    return mapCongViec(payload.data);
}

module.exports = {
    TRANG_THAI_OPTIONS,
    LOAI_CONG_VIEC_OPTIONS,
    chuanHoaQuery,
    mapCongViec,
    layDanhSach,
    layChiTiet,
    huy
};