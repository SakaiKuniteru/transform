'use strict';

const backendClient = require('../../../core/api/backend-client');

const sessionService = require('../../../core/auth/session.service');

const MA_HAN_MUC = Object.freeze({
    UPLOAD_TONG_SO_LAN: 'Tổng số lần tải lên',
    UPLOAD_TONG_SO_TEP: 'Tổng số tệp tải lên',
    UPLOAD_SO_TEP_MOI_LAN: 'Số tệp mỗi lần tải',
    UPLOAD_KICH_THUOC_MOI_TEP: 'Kích thước tối đa mỗi tệp'
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

const TRANG_THAI = Object.freeze({
    AP_DUNG: 'Đang áp dụng',
    CHUA_CAU_HINH: 'Chưa cấu hình'
});

function taoAuthOptions(req, options = {}) {
    return {
        ...options,
        accessToken: sessionService.layAccessToken(req),
        requestId: req.requestId || null
    };
}

function chuanHoaId(value) {
    if (value === undefined || value === null || value === '') { return null; }
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
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

function dinhDangGiaTri(value, donVi) {
    if (value === null || value === undefined) { return '-'; }
    const so = Number(value);
    if (!Number.isFinite(so)) { return String(value); }
    if (donVi === 'BYTE') {
        if (so <= 0) { return '0 B'; }
        const danhSachDonVi = [ 'B', 'KB', 'MB', 'GB', 'TB', 'PB' ];
        const bac = Math.min(Math.floor(Math.log(so) / Math.log(1024)), danhSachDonVi.length - 1);
        const giaTri = so / (1024 ** bac);
        return `${giaTri >= 10 || bac === 0 ? giaTri.toFixed(0) : giaTri.toFixed(1)} ${danhSachDonVi[bac]}`;
    }
    const hauTo = donVi === 'LAN' ? ' lần' : donVi === 'TEP' ? ' tệp' : '';
    return `${so.toLocaleString('vi-VN')}${hauTo}`;
}

function tinhPhanTram(item) {
    if (item.khongGioiHan || item.gioiHan === null || item.gioiHan === undefined) { return null; }
    const gioiHan = Number(item.gioiHan);
    const daSuDung = Number(item.daSuDung || 0);
    if (!Number.isFinite(gioiHan) || !Number.isFinite(daSuDung) || gioiHan <= 0) { return null; }
    return Math.min(100, Math.max(0, Math.round((daSuDung / gioiHan) * 100)));
}

function mapHanMuc(item) {
    if (!item) { return null; }
    return {
        ...item,
        maHanhDongHienThi: MA_HAN_MUC[item.maHanhDong] || item.maHanhDong || '-',
        trangThaiHienThi: TRANG_THAI[item.trangThai] || item.trangThai || '-',
        donViHienThi: DON_VI[item.donVi] || item.donVi || '-',
        chuKyHienThi: CHU_KY[item.chuKy] || item.chuKy || '-',
        gioiHanHienThi: item.khongGioiHan ? 'Không giới hạn' : dinhDangGiaTri(item.gioiHan, item.donVi),
        daSuDungHienThi: item.khongGioiHan ? dinhDangGiaTri(item.daSuDung || 0, item.donVi) : dinhDangGiaTri(item.daSuDung, item.donVi),
        conLaiHienThi: item.khongGioiHan ? 'Không giới hạn' : dinhDangGiaTri(item.conLai, item.donVi),
        kyBatDauHienThi: dinhDangNgay(item.kyBatDau),
        kyKetThucHienThi: dinhDangNgay(item.kyKetThuc),
        phanTram: tinhPhanTram(item)
    };
}

function mapTongQuan(data) {
    if (!data) { return null; }
    return {
        ...data,
        danhSachHanMuc: Object.values(data.hanMuc || {}).map(mapHanMuc),
        dangKyGoi: data.dangKyGoi ? {
            ...data.dangKyGoi,
            batDauLucHienThi: dinhDangNgay(data.dangKyGoi.batDauLuc),
            hetHanLucHienThi: dinhDangNgay(data.dangKyGoi.hetHanLuc)
        } : null
    };
}

async function layNguoiDungOptions(req, tuKhoa = '') {
    const payload = await backendClient.get('/nguoi-dung', taoAuthOptions(req, {
        params: {
            page: 1,
            pageSize: 100,
            tuKhoa: String(tuKhoa || '').trim()
        }
    }));
    return (payload.data || []).map((nguoiDung) => ({
        value: nguoiDung.id,
        label: `${nguoiDung.hoTen || nguoiDung.email} - ${nguoiDung.email}`,
        trangThai: nguoiDung.trangThai
    }));
}

async function layTongQuanNguoiDung(req, nguoiDungId) {
    const id = chuanHoaId(nguoiDungId);
    if (!id) { throw new TypeError('ID người dùng không hợp lệ.'); }
    const payload = await backendClient.get(`/han-muc/nguoi-dung/${id}`, taoAuthOptions(req));
    return mapTongQuan(payload.data);
}

module.exports = {
    MA_HAN_MUC,
    chuanHoaId,
    mapHanMuc,
    mapTongQuan,
    layNguoiDungOptions,
    layTongQuanNguoiDung
};