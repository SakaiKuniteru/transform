'use strict';
const crypto = require('node:crypto');
const { loaiChuyenDoi, trangThaiCongViec } = require('@transform/shared');
const backendClient = require('../../../core/api/backend-client');
const sessionService = require('../../../core/auth/session.service');

function taoAuthOptions(req, options = {}) {
    return {
        ...options,
        accessToken: sessionService.layAccessToken(req),
        requestId: req.requestId || null
    };
}

function chuanHoaSo(value, macDinh = null) {
    if (value === undefined || value === null || value === '') { return macDinh; }
    const so = Number(value);
    return Number.isSafeInteger(so) ? so : macDinh;
}

function chuanHoaTuyChon(value) {
    if (!value) { return {}; }
    if (typeof value === 'object' && !Array.isArray(value)) { return value; }
    if (typeof value !== 'string') { throw new TypeError('Tùy chọn chuyển đổi không hợp lệ.'); }
    try {
        const parsed = JSON.parse(value);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) { throw new TypeError('Tùy chọn chuyển đổi phải là object.'); }
        return parsed;
    } catch (error) { if (error instanceof TypeError) { throw error; } throw new TypeError('Tùy chọn chuyển đổi không phải JSON hợp lệ.'); }
}

function mapTepNguon(tep) {
    return {
        id: tep.id,
        tenTep: tep.tenTep,
        phienBanId: tep.phienBanHienTai?.id || null,
        dinhDang: tep.phienBanHienTai?.dinhDang || null,
        mimeType: tep.phienBanHienTai?.mimeType || null,
        kichThuocBytes: Number(tep.phienBanHienTai?.kichThuocBytes || 0)
    };
}

function mapCongViec(congViec) {
    const thongTinTrangThai = trangThaiCongViec.layThongTinTrangThai(congViec?.trangThai);
    const thongTinLoai = loaiChuyenDoi.layThongTinLoaiChuyenDoi(congViec?.tuyChon?.loaiChuyenDoi);
    return {
        ...congViec,
        trangThaiHienThi: thongTinTrangThai?.ten || congViec?.trangThai || '-',
        loaiHienThi: thongTinLoai?.ten || congViec?.loaiCongViec || '-'
    };
}

async function layHoTro(req, query = {}) {
    const params = {
        loaiChuyenDoi: query.loaiChuyenDoi || undefined,
        dinhDangNguon: query.dinhDangNguon || undefined,
        dinhDangDich: query.dinhDangDich || undefined,
        nhomXuLy: query.nhomXuLy || undefined
    };
    const payload = await backendClient.get('/chuyen-doi/ho-tro', { requestId: req.requestId || null, params });
    return payload.data || [];
}

async function layTepNguon(req) {
    const payload = await backendClient.get('/tep/cua-toi', taoAuthOptions(req, { params: { trang: 1, gioiHan: 100, trangThai: 'HOAT_DONG' } }));
    return (payload.data?.danhSach || []).filter((tep) => tep.phienBanHienTai?.trangThai === 'SAN_SANG').map(mapTepNguon);
}

async function layTrang(req, query = {}) {
    const [teps, hoTro] = await Promise.all([
        layTepNguon(req),
        layHoTro(req, query)
    ]);
    return {
        teps,
        hoTro,
        tepDaChonId: chuanHoaSo(query.tepId)
    };
}

async function tao(req, values = {}) {
    const data = {
        tepNguonId: chuanHoaSo(values.tepNguonId),
        phienBanNguonId: chuanHoaSo(values.phienBanNguonId),
        loaiChuyenDoi: String(values.loaiChuyenDoi || '').trim().toUpperCase(),
        dinhDangDich: String(values.dinhDangDich || '').trim() || null,
        converterKey: String(values.converterKey || '').trim() || undefined,
        mucDoUuTien: chuanHoaSo(values.mucDoUuTien, 5),
        soLanThuToiDa: chuanHoaSo(values.soLanThuToiDa, 3),
        khoaIdempotency: String(values.khoaIdempotency || '').trim() || crypto.randomUUID(),
        tuyChon: chuanHoaTuyChon(values.tuyChon)
    };
    const payload = await backendClient.post('/chuyen-doi', data, taoAuthOptions(req, { headers: { 'Idempotency-Key': data.khoaIdempotency } }));
    return {
        ...payload.data,
        congViec: mapCongViec(payload.data?.congViec)
    };
}

async function layChiTiet(req, id) {
    const payload = await backendClient.get(`/chuyen-doi/${id}`, taoAuthOptions(req));
    return {
        ...payload.data,
        congViec: mapCongViec(payload.data?.congViec)
    };
}

module.exports = {
    layHoTro,
    layTepNguon,
    layTrang,
    tao,
    layChiTiet
};