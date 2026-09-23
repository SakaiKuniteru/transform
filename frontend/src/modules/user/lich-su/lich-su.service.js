'use strict';

const backendClient = require('../../../core/api/backend-client');
const sessionService = require('../../../core/auth/session.service');

const LOAI_SU_KIEN = Object.freeze({
    TEP_DA_TAI_LEN: 'Tệp đã tải lên',
    TEP_DA_CAP_NHAT: 'Tệp đã cập nhật',
    TEP_DA_XOA: 'Tệp đã xóa',
    CHUYEN_DOI_DA_TAO: 'Đã tạo chuyển đổi',
    CHUYEN_DOI_BAT_DAU: 'Chuyển đổi bắt đầu',
    CHUYEN_DOI_HOAN_THANH: 'Chuyển đổi hoàn thành',
    CHUYEN_DOI_THAT_BAI: 'Chuyển đổi thất bại',
    CHUYEN_DOI_DA_HUY: 'Chuyển đổi đã hủy',
    TEP_KET_QUA_DA_TAO: 'Đã tạo tệp kết quả'
});

const NGUON_LICH_SU = Object.freeze({
    HE_THONG: 'Hệ thống',
    API: 'API',
    UPLOAD: 'Upload',
    WORKER: 'Worker',
    QUEUE: 'Queue',
    STORAGE: 'Storage'
});

const LOAI_SU_KIEN_OPTIONS = Object.freeze(
    Object.entries(LOAI_SU_KIEN)
        .map(([ value, label ]) => Object.freeze({
            value,
            label
        }))
);

const NGUON_OPTIONS = Object.freeze(
    Object.entries(NGUON_LICH_SU)
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

function chuanHoaId(value) {
    const so = Number(value);
    return Number.isSafeInteger(so) && so > 0 ? so : undefined;
}

function chuanHoaNgay(value, cuoiNgay = false) {
    const text = String(value || '').trim();
    if (!text) { return undefined; }
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) { return `${text}T${cuoiNgay ? '23:59:59.999' : '00:00:00.000'}+07:00`; }
    return text;
}

function chuanHoaQuery(query = {}) {
    return {
        trang: chuanHoaTrang(query.page || query.trang),
        gioiHan: Math.min(100, chuanHoaTrang(query.pageSize || query.gioiHan, 20)),
        loaiSuKien: String(query.loaiSuKien || '').trim().toUpperCase() || undefined,
        nguon: String(query.nguon || '').trim().toUpperCase() || undefined,
        congViecId: chuanHoaId(query.congViecId),
        tepId: chuanHoaId(query.tepId),
        phienBanTepId: chuanHoaId(query.phienBanTepId),
        tuKhoa: String(query.tuKhoa || query.q || '').trim(),
        tuNgay: chuanHoaNgay(query.tuNgay),
        denNgay: chuanHoaNgay(query.denNgay, true)
    };
}

function mapLichSu(item) {
    return {
        ...item,
        loaiSuKienHienThi: LOAI_SU_KIEN[item.loaiSuKien] || item.loaiSuKien || '-',
        nguonHienThi: NGUON_LICH_SU[item.nguon] || item.nguon || '-',
        createdAtHienThi: dinhDangNgay(item.createdAt),
        tenTepHienThi: item.tep?.tenTep || item.phienBanTep?.tenTep || null
    };
}

async function layDanhSach(req, query = {}) {
    const params = chuanHoaQuery(query);
    const payload = await backendClient.get('/lich-su/cua-toi', taoAuthOptions(req, {
        params
    }));
    const data = payload.data || {};
    return {
        danhSach: (data.danhSach || []).map(mapLichSu),
        phanTrang: data.phanTrang || {
            trang: params.trang,
            gioiHan: params.gioiHan,
            tongSo: 0,
            tongTrang: 1
        }
    };
}

module.exports = {
    LOAI_SU_KIEN,
    NGUON_LICH_SU,
    LOAI_SU_KIEN_OPTIONS,
    NGUON_OPTIONS,
    chuanHoaQuery,
    mapLichSu,
    layDanhSach
};