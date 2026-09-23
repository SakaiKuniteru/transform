'use strict';
const { trangThaiCongViec, loaiChuyenDoi } = require('@transform/shared');
const backendClient = require('../../../core/api/backend-client');
const sessionService = require('../../../core/auth/session.service');

function taoAuthOptions(req, params = {}) {
    return {
        accessToken: sessionService.layAccessToken(req),
        requestId: req.requestId || null,
        params
    };
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

function mapTep(tep) {
    return {
        ...tep,
        kichThuocHienThi: dinhDangKichThuoc(tep.phienBanHienTai?.kichThuocBytes),
        dinhDangHienThi: String(tep.phienBanHienTai?.dinhDang || '-').toUpperCase(),
        createdAtHienThi: dinhDangNgay(tep.createdAt)
    };
}

function mapCongViec(congViec) {
    const thongTinTrangThai = trangThaiCongViec.layThongTinTrangThai(congViec.trangThai);
    const thongTinLoai = loaiChuyenDoi.layThongTinLoaiChuyenDoi(congViec.tuyChon?.loaiChuyenDoi);
    return {
        ...congViec,
        trangThaiHienThi: thongTinTrangThai?.ten || congViec.trangThai || '-',
        loaiHienThi: thongTinLoai?.ten || congViec.loaiCongViec || '-',
        createdAtHienThi: dinhDangNgay(congViec.createdAt)
    };
}

function mapLichSu(item) {
    return {
        ...item,
        createdAtHienThi: dinhDangNgay(item.createdAt)
    };
}

async function layDashboard(req) {
    const [tepPayload, congViecPayload, lichSuPayload] = await Promise.all([
        backendClient.get('/tep/cua-toi', taoAuthOptions(req, { trang: 1, gioiHan: 5 })),
        backendClient.get('/cong-viec/cua-toi', taoAuthOptions(req, { trang: 1, gioiHan: 5 })),
        backendClient.get('/lich-su/cua-toi', taoAuthOptions(req, { trang: 1, gioiHan: 8 }))
    ]);
    const tep = tepPayload.data || {};
    const congViec = congViecPayload.data || {};
    const lichSu = lichSuPayload.data || {};
    return {
        thongKe: {
            tongSoTep: Number(tep.phanTrang?.tongSo || 0),
            tongSoCongViec: Number(congViec.phanTrang?.tongSo || 0),
            tongSoLichSu: Number(lichSu.phanTrang?.tongSo || 0)
        },
        tepGanDay: (tep.danhSach || []).map(mapTep),
        congViecGanDay: (congViec.danhSach || []).map(mapCongViec),
        lichSuGanDay: (lichSu.danhSach || []).map(mapLichSu)
    };
}

module.exports = {
    layDashboard
};