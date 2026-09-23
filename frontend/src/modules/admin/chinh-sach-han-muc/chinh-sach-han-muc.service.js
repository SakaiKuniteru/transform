'use strict';

const backendClient = require('../../../core/api/backend-client');
const sessionService = require('../../../core/auth/session.service');

const DOI_TUONG = Object.freeze({
    KHACH: 'Khách',
    NGUOI_DUNG: 'Người dùng',
    LOAI_TAI_KHOAN: 'Loại tài khoản',
    GOI_DICH_VU: 'Gói dịch vụ'
});

const DON_VI = Object.freeze({
    LAN: 'Lần',
    TEP: 'Tệp',
    BYTE: 'Byte'
});

const CHU_KY = Object.freeze({
    MOI_REQUEST: 'Mỗi request',
    MOI_TEP: 'Mỗi tệp',
    NGAY: 'Ngày',
    TUAN: 'Tuần',
    THANG: 'Tháng',
    THEO_GOI: 'Theo gói',
    TOAN_THOI_GIAN: 'Toàn thời gian'
});

const HANH_DONG_KHI_VUOT = Object.freeze({
    TU_CHOI: 'Từ chối',
    YEU_CAU_DANG_NHAP: 'Yêu cầu đăng nhập',
    YEU_CAU_NANG_CAP: 'Yêu cầu nâng cấp'
});

const MA_HAN_MUC = Object.freeze({
    UPLOAD_TONG_SO_LAN: 'Tổng số lần tải lên mỗi ngày',
    UPLOAD_TONG_SO_TEP: 'Tổng số tệp theo gói',
    UPLOAD_SO_TEP_MOI_LAN: 'Số tệp mỗi lần tải',
    UPLOAD_KICH_THUOC_MOI_TEP: 'Kích thước tối đa mỗi tệp'
});

const DOI_TUONG_OPTIONS = Object.freeze(
    Object.entries(DOI_TUONG)
        .map(([ value, label ]) => Object.freeze({
            value,
            label
        }))
);

const DON_VI_OPTIONS = Object.freeze(
    Object.entries(DON_VI)
        .map(([ value, label ]) => Object.freeze({
            value,
            label
        }))
);

const CHU_KY_OPTIONS = Object.freeze(
    Object.entries(CHU_KY)
        .map(([ value, label ]) => Object.freeze({
            value,
            label
        }))
);

const HANH_DONG_OPTIONS = Object.freeze(
    Object.entries(HANH_DONG_KHI_VUOT)
        .map(([ value, label ]) => Object.freeze({
            value,
            label
        }))
);

const MA_HAN_MUC_OPTIONS = Object.freeze(
    Object.entries(MA_HAN_MUC)
        .map(([ value, label ]) => Object.freeze({
            value,
            label
        }))
);

const LOAI_TAI_KHOAN_OPTIONS = Object.freeze([
    Object.freeze({
        value: 'NGUOI_DUNG',
        label: 'Người dùng'
    }),
    Object.freeze({
        value: 'QUAN_TRI',
        label: 'Quản trị'
    }),
    Object.freeze({
        value: 'HE_THONG',
        label: 'Hệ thống'
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

function chuanHoaId(value) {
    if (value === undefined || value === null || value === '') { return undefined; }
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

function chuanHoaSoNguyen(value, macDinh = null) {
    if (value === undefined || value === null || value === '') { return macDinh; }
    const so = Number(value);
    return Number.isSafeInteger(so) ? so : macDinh;
}

function chuanHoaNgay(value) {
    const text = String(value || '').trim();
    if (!text) { return undefined; }
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

function dinhDangDateTimeInput(value) {
    if (!value) { return ''; }
    const ngay = new Date(value);
    if (Number.isNaN(ngay.getTime())) { return ''; }
    const formatter = new Intl.DateTimeFormat('sv-SE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Ho_Chi_Minh'
    });
    return formatter.format(ngay).replace(' ', 'T');
}

function dinhDangGioiHan(value, donVi, khongGioiHan) {
    if (khongGioiHan) { return 'Không giới hạn'; }
    if (value === null || value === undefined) { return '-'; }
    if (donVi === 'BYTE') {
        const bytes = Number(value);
        if (bytes < 1024) { return `${bytes.toLocaleString('vi-VN')} B`; }
        const units = [ 'KB', 'MB', 'GB', 'TB' ];
        let so = bytes / 1024;
        let index = 0;
        while (so >= 1024 && index < units.length - 1) {
            so /= 1024;
            index += 1;
        }
        return `${so >= 10 ? so.toFixed(0) : so.toFixed(1)} ${units[index]}`;
    }
    return `${Number(value).toLocaleString('vi-VN')} ${DON_VI[donVi] ? DON_VI[donVi].toLowerCase() : ''}`.trim();
}

function chuanHoaQuery(query = {}) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
    return {
        tuKhoa: String(query.tuKhoa || query.q || '').trim(),
        doiTuong: String(query.doiTuong || '').trim() || undefined,
        loaiTaiKhoan: String(query.loaiTaiKhoan || '').trim() || undefined,
        goiDichVuId: chuanHoaId(query.goiDichVuId),
        maHanhDong: String(query.maHanhDong || '').trim() || undefined,
        donVi: String(query.donVi || '').trim() || undefined,
        chuKy: String(query.chuKy || '').trim() || undefined,
        active: chuanHoaBoolean(query.active),
        dangHieuLuc: chuanHoaBoolean(query.dangHieuLuc),
        page,
        limit,
        sortBy: String(query.sortBy || 'mucDoUuTien'),
        sortOrder: String(query.sortOrder || 'asc').toLowerCase()
    };
}

function mapChinhSach(item) {
    if (!item) { return null; }
    return {
        ...item,
        doiTuongHienThi: DOI_TUONG[item.doiTuong] || item.doiTuong || '-',
        maHanhDongHienThi: MA_HAN_MUC[item.maHanhDong] || item.maHanhDong || '-',
        donViHienThi: DON_VI[item.donVi] || item.donVi || '-',
        chuKyHienThi: CHU_KY[item.chuKy] || item.chuKy || '-',
        hanhDongKhiVuotHienThi: HANH_DONG_KHI_VUOT[item.hanhDongKhiVuot] || item.hanhDongKhiVuot || '-',
        gioiHanHienThi: dinhDangGioiHan(item.gioiHan, item.donVi, item.khongGioiHan),
        hieuLucTuHienThi: dinhDangNgay(item.hieuLucTu),
        hieuLucDenHienThi: item.hieuLucDen ? dinhDangNgay(item.hieuLucDen) : 'Không thời hạn',
        createdAtHienThi: dinhDangNgay(item.createdAt),
        updatedAtHienThi: dinhDangNgay(item.updatedAt)
    };
}

function chuanHoaDuLieu(values = {}) {
    const doiTuong = String(values.doiTuong || '').trim().toUpperCase();
    const khongGioiHan = chuanHoaBoolean(values.khongGioiHan) === true;
    return {
        ma: String(values.ma || '').trim().toUpperCase(),
        ten: String(values.ten || '').trim(),
        doiTuong,
        loaiTaiKhoan: doiTuong === 'LOAI_TAI_KHOAN' ? String(values.loaiTaiKhoan || '').trim().toUpperCase() || null : null,
        goiDichVuId: doiTuong === 'GOI_DICH_VU' ? chuanHoaId(values.goiDichVuId) || null : null,
        maHanhDong: String(values.maHanhDong || '').trim().toUpperCase(),
        donVi: String(values.donVi || '').trim().toUpperCase(),
        chuKy: String(values.chuKy || '').trim().toUpperCase(),
        muiGio: String(values.muiGio || 'UTC').trim(),
        gioiHan: khongGioiHan ? null : chuanHoaSoNguyen(values.gioiHan),
        khongGioiHan,
        hanhDongKhiVuot: String(values.hanhDongKhiVuot || 'TU_CHOI').trim().toUpperCase(),
        mucDoUuTien: Math.max(1, chuanHoaSoNguyen(values.mucDoUuTien, 100)),
        hieuLucTu: chuanHoaNgay(values.hieuLucTu),
        hieuLucDen: chuanHoaNgay(values.hieuLucDen) || null,
        active: chuanHoaBoolean(values.active) === true
    };
}

async function layDanhSach(req, query = {}) {
    const params = chuanHoaQuery(query);
    const payload = await backendClient.get('/chinh-sach-han-muc', taoAuthOptions(req, {
        params
    }));
    return {
        danhSach: (payload.data || []).map(mapChinhSach),
        phanTrang: {
            page: Number(payload.meta?.page || params.page),
            limit: Number(payload.meta?.limit || params.limit),
            total: Number(payload.meta?.total || 0),
            totalPages: Math.max(1, Number(payload.meta?.totalPages || 1))
        }
    };
}

async function layChiTiet(req, id) {
    const payload = await backendClient.get(`/chinh-sach-han-muc/${id}`, taoAuthOptions(req));
    return mapChinhSach(payload.data);
}

async function layGoiOptions(req) {
    const payload = await backendClient.get('/goi-dich-vu', taoAuthOptions(req, {
        params: {
            page: 1,
            limit: 100,
            sortBy: 'thuTu',
            sortOrder: 'asc'
        }
    }));
    return (payload.data || []).map((goi) => ({
        value: goi.id,
        label: `${goi.ten} (${goi.ma})${goi.active ? '' : ' - ngừng hoạt động'}`
    }));
}

async function taoMoi(req, values) {
    const payload = await backendClient.post('/chinh-sach-han-muc', chuanHoaDuLieu(values), taoAuthOptions(req));
    return mapChinhSach(payload.data);
}

async function capNhat(req, id, values) {
    const payload = await backendClient.patch(`/chinh-sach-han-muc/${id}`, chuanHoaDuLieu(values), taoAuthOptions(req));
    return mapChinhSach(payload.data);
}

async function capNhatTrangThai(req, id, active) {
    const payload = await backendClient.patch(`/chinh-sach-han-muc/${id}/trang-thai`, {
        active: active === true
    }, taoAuthOptions(req));
    return mapChinhSach(payload.data);
}

async function xoa(req, id) {
    await backendClient.delete(`/chinh-sach-han-muc/${id}`, taoAuthOptions(req));
    return true;
}

module.exports = {
    DOI_TUONG,
    DON_VI,
    CHU_KY,
    HANH_DONG_KHI_VUOT,
    MA_HAN_MUC,
    DOI_TUONG_OPTIONS,
    DON_VI_OPTIONS,
    CHU_KY_OPTIONS,
    HANH_DONG_OPTIONS,
    MA_HAN_MUC_OPTIONS,
    LOAI_TAI_KHOAN_OPTIONS,
    chuanHoaQuery,
    mapChinhSach,
    chuanHoaDuLieu,
    dinhDangDateTimeInput,
    layDanhSach,
    layChiTiet,
    layGoiOptions,
    taoMoi,
    capNhat,
    capNhatTrangThai,
    xoa
};