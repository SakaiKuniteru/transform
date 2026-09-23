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
    const teps = await layTepNguon(req);
    const tepDaChonId = chuanHoaSo(query.tepId) || teps[0]?.id || null;
    const tepDaChon = teps.find((tep) => Number(tep.id) === Number(tepDaChonId)) || null;
    const hoTro = tepDaChon ? await layHoTro(req, { loaiChuyenDoi: 'CHUYEN_DINH_DANG', dinhDangNguon: tepDaChon.dinhDang }) : [];
    return {
        teps,
        hoTro,
        tepDaChonId,
        tepDaChon
    };
}

function coGiaTri(value) { return value !== undefined && value !== null && value !== ''; }

function themNeuCo(target, key, value) {
    if (coGiaTri(value)) { target[key] = value; }
    return target;
}

function taoTuyChon(values = {}) {
    const formKey = String(values.formKey || '').trim();
    const tuyChon = {};
    if (formKey === 'chuyen-dinh-dang') { return themNeuCo(tuyChon, 'soBuocToiDa', chuanHoaSo(values.soBuocToiDa)); }
    if (formKey === 'hinh-anh') { return { chatLuong: chuanHoaSo(values.chatLuong, 85), giuMetadata: values.giuMetadata === true, mauNen: values.mauNen || '#ffffff' }; }
    if (formKey === 'resize') { themNeuCo(tuyChon, 'chieuRong', chuanHoaSo(values.chieuRong)); themNeuCo(tuyChon, 'chieuCao', chuanHoaSo(values.chieuCao)); return { ...tuyChon, cheDo: values.cheDo || 'cover', viTri: values.viTri || 'centre', khongPhongTo: values.khongPhongTo === true }; }
    if (formKey === 'crop') { return { x: chuanHoaSo(values.x, 0), y: chuanHoaSo(values.y, 0), chieuRong: chuanHoaSo(values.chieuRong), chieuCao: chuanHoaSo(values.chieuCao) }; }
    if (formKey === 'rotate') { return { goc: Number(values.goc), mauNen: values.mauNen || '#ffffff' }; }
    if (formKey === 'optimize') { return { chatLuong: chuanHoaSo(values.chatLuong, 85), mucNen: chuanHoaSo(values.mucNen, 9), giuMetadata: values.giuMetadata === true, progressive: values.progressive === true, lossless: values.lossless === true }; }
    if (formKey === 'ma-hoa') { return { urlSafe: values.urlSafe === true, padding: values.padding === true, dataUri: values.dataUri === true, lineLength: chuanHoaSo(values.lineLength, 0) }; }
    if (formKey === 'giai-ma') { return { urlSafe: values.urlSafe === true, choPhepKhoangTrang: values.choPhepKhoangTrang === true }; }
    if (formKey === 'nen') { return { level: chuanHoaSo(values.level, 6) }; }
    if (formKey === 'giai-nen') { return {}; }
    if (formKey === 'ocr') { themNeuCo(tuyChon, 'psm', chuanHoaSo(values.psm)); themNeuCo(tuyChon, 'oem', chuanHoaSo(values.oem)); return { ...tuyChon, ngonNgu: values.ngonNgu || 'vie+eng', preserveInterwordSpaces: values.preserveInterwordSpaces === true }; }
    if (formKey === 'trich-xuat') { return { kieu: values.kieu || 'VAN_BAN', giuNguyenMarkup: values.giuNguyenMarkup === true, delimiter: values.delimiter || ',', maxRows: chuanHoaSo(values.maxRows, 100000) }; }
    if (formKey === 'dich') { return { ngonNguNguon: values.ngonNguNguon || 'auto', ngonNguDich: values.ngonNguDich, maxChars: chuanHoaSo(values.maxChars, 4000) }; }
    if (formKey === 'ai-text') { return { chiDan: String(values.chiDan || '').trim() || null }; }
    return chuanHoaTuyChon(values.tuyChon);
}

function layDinhDangDich(values = {}) {
    if (values.formKey === 'trich-xuat') { return String(values.kieu || '').toUpperCase() === 'VAN_BAN' ? 'txt' : 'json'; }
    return String(values.dinhDangDich || '').trim() || null;
}

async function tao(req, values = {}) {
    const data = {
        tepNguonId: chuanHoaSo(values.tepNguonId),
        phienBanNguonId: chuanHoaSo(values.phienBanNguonId),
        loaiChuyenDoi: String(values.loaiChuyenDoi || '').trim().toUpperCase(),
        dinhDangDich: layDinhDangDich(values),
        converterKey: String(values.converterKey || '').trim() || undefined,
        mucDoUuTien: chuanHoaSo(values.mucDoUuTien, 5),
        soLanThuToiDa: chuanHoaSo(values.soLanThuToiDa, 3),
        khoaIdempotency: String(values.khoaIdempotency || '').trim() || crypto.randomUUID(),
        tuyChon: taoTuyChon(values)
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
    layChiTiet,
    taoTuyChon,
    layDinhDangDich
};