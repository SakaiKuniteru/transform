'use strict';

const repository = require('./nhat-ky.repository');

const MUC_DO_NHAT_KY = Object.freeze({
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    SECURITY: 'SECURITY',
    AUDIT: 'AUDIT'
});

const DANH_SACH_MUC_DO = Object.freeze(Object.values(MUC_DO_NHAT_KY));
const TRUONG_NHAY_CAM = new Set([
    'password',
    'matkhau',
    'mat_khau',
    'token',
    'accesstoken',
    'access_token',
    'refreshtoken',
    'refresh_token',
    'authorization',
    'cookie',
    'setcookie',
    'secret',
    'clientsecret',
    'client_secret',
    'apikey',
    'api_key',
    'xapikey',
    'x_api_key',
    'otp',
    'maxacthuc',
    'ma_xac_thuc'
]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseId(value, ten) {
    if (value === undefined || value === null || value === '') { return null; }
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) { throw new TypeError(`${ten} không hợp lệ.`); }
    return id;
}

function chuanHoaChuoi(value, ten, maxLength, batBuoc = false) {
    if (value === undefined || value === null) {
        if (batBuoc) { throw new TypeError(`${ten} là bắt buộc.`); }
        return null;
    }
    const text = String(value).trim();
    if (batBuoc && !text) { throw new TypeError(`${ten} không được để trống.`); }
    if (!text) { return null; }
    return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function chuanHoaMucDo(value) {
    const mucDo = String(value || MUC_DO_NHAT_KY.INFO).trim().toUpperCase();
    if (!DANH_SACH_MUC_DO.includes(mucDo)) { throw new TypeError(`Mức độ nhật ký "${mucDo}" không hợp lệ.`); }
    return mucDo;
}

function chuanHoaRequestId(value) {
    if (value === undefined || value === null || value === '') { return null; }
    const text = String(value).trim();
    return UUID_PATTERN.test(text) ? text : null;
}

function chuanHoaHttpStatus(value) {
    if (value === undefined || value === null || value === '') { return null; }
    const status = Number(value);
    if (!Number.isSafeInteger(status) || status < 100 || status > 599) { throw new TypeError('HTTP status không hợp lệ.'); }
    return status;
}

function chuanHoaHetHanLuc(value) {
    if (value === undefined || value === null || value === '') { return null; }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) { throw new TypeError('Thời gian hết hạn nhật ký không hợp lệ.'); }
    return date;
}

function laTruongNhayCam(key) { return TRUONG_NHAY_CAM.has(String(key || '').replace(/[^A-Za-z0-9_]/g, '').toLowerCase()); }

function lamSachDuLieu(value, state = null, depth = 0) {
    const context = state || { seen: new WeakSet() };
    if (value === undefined) { return null; }
    if (value === null || typeof value === 'boolean' || typeof value === 'number') { return value; }
    if (typeof value === 'bigint') { return value.toString(); }
    if (typeof value === 'string') { return value.length > 5000 ? `${value.slice(0, 5000)}…` : value; }
    if (Buffer.isBuffer(value)) { return { type: 'Buffer', length: value.length }; }
    if (value instanceof Date) { return value.toISOString(); }
    if (value instanceof Error) { return { name: value.name, message: chuanHoaChuoi(value.message, 'Thông báo lỗi', 5000), code: value.code || value.maLoi || null }; }
    if (typeof value !== 'object') { return String(value); }
    if (depth >= 8) { return '[MaxDepth]'; }
    if (context.seen.has(value)) { return '[Circular]'; }
    context.seen.add(value);
    if (Array.isArray(value)) { return value.slice(0, 100).map((item) => lamSachDuLieu(item, context, depth + 1)); }
    const result = {};
    for (const [key, item] of Object.entries(value).slice(0, 200)) { result[key] = laTruongNhayCam(key) ? '[REDACTED]' : lamSachDuLieu(item, context, depth + 1); }
    return result;
}

function chuanHoaDuLieu(value) {
    if (value === undefined || value === null) { return {}; }
    return lamSachDuLieu(value);
}

async function ghi(data = {}, db = null) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) { throw new TypeError('Dữ liệu nhật ký phải là object.'); }
    const nguoiDungId = parseId(data.nguoiDungId, 'ID người dùng');
    const phienKhachId = parseId(data.phienKhachId, 'ID phiên khách');
    if (nguoiDungId && phienKhachId) { throw new TypeError('Nhật ký không thể đồng thời thuộc người dùng và phiên khách.'); }
    return repository.ghi({
        mucDo: chuanHoaMucDo(data.mucDo),
        nguon: chuanHoaChuoi(data.nguon, 'Nguồn nhật ký', 100, true),
        maSuKien: chuanHoaChuoi(data.maSuKien, 'Mã sự kiện', 100),
        requestId: chuanHoaRequestId(data.requestId),
        traceId: chuanHoaChuoi(data.traceId, 'Trace ID', 100),
        nguoiDungId,
        phienKhachId,
        congViecId: parseId(data.congViecId, 'ID công việc'),
        buocCongViecId: parseId(data.buocCongViecId, 'ID bước công việc'),
        tepId: parseId(data.tepId, 'ID tệp'),
        phuongThucHttp: chuanHoaChuoi(data.phuongThucHttp, 'Phương thức HTTP', 10)?.toUpperCase() || null,
        duongDanHttp: chuanHoaChuoi(data.duongDanHttp, 'Đường dẫn HTTP', 5000),
        httpStatus: chuanHoaHttpStatus(data.httpStatus),
        diaChiIp: chuanHoaChuoi(data.diaChiIp, 'Địa chỉ IP', 100),
        userAgent: chuanHoaChuoi(data.userAgent, 'User-Agent', 5000),
        thongDiep: chuanHoaChuoi(data.thongDiep, 'Thông điệp nhật ký', 20000, true),
        duLieu: chuanHoaDuLieu(data.duLieu),
        stackTrace: chuanHoaChuoi(data.stackTrace, 'Stack trace', 50000),
        hetHanLuc: chuanHoaHetHanLuc(data.hetHanLuc)
    }, db);
}

async function ghiAnToan(data = {}, db = null) {
    try { return await ghi(data, db); } catch { return null; }
}

function taoDuLieuRequest(req, data = {}) {
    if (!req || typeof req !== 'object') { throw new TypeError('Request không hợp lệ.'); }
    const requestId = chuanHoaRequestId(data.requestId || req.requestId);
    const traceMacDinh = requestId ? null : req.requestId || null;
    return {
        ...data,
        requestId,
        traceId: data.traceId || req.get?.('x-trace-id') || traceMacDinh,
        nguoiDungId: data.nguoiDungId || req.user?.id || null,
        phienKhachId: data.phienKhachId || req.phienKhach?.id || req.phienKhachId || null,
        phuongThucHttp: data.phuongThucHttp || req.method || null,
        duongDanHttp: data.duongDanHttp || req.originalUrl || req.url || null,
        diaChiIp: data.diaChiIp || req.ip || null,
        userAgent: data.userAgent || req.get?.('user-agent') || null
    };
}

async function ghiTuRequest(req, data = {}, db = null) { return ghi(taoDuLieuRequest(req, data), db); }

async function ghiTuRequestAnToan(req, data = {}, db = null) {
    try { return await ghiTuRequest(req, data, db); } catch { return null; }
}

async function ghiLoi(error, data = {}, db = null) {
    const loi = error instanceof Error ? error : new Error(String(error || 'Lỗi không xác định.'));
    const duLieu = data.duLieu && typeof data.duLieu === 'object' && !Array.isArray(data.duLieu) ? data.duLieu : {};
    return ghi({
        ...data,
        mucDo: data.mucDo || MUC_DO_NHAT_KY.ERROR,
        thongDiep: data.thongDiep || loi.message || 'Lỗi hệ thống.',
        stackTrace: data.stackTrace || loi.stack || null,
        duLieu: {
            ...duLieu,
            loi: {
                name: loi.name,
                code: loi.code || loi.maLoi || null,
                statusCode: loi.statusCode || null,
                message: loi.message
            }
        }
    }, db);
}

async function ghiLoiAnToan(error, data = {}, db = null) {
    try { return await ghiLoi(error, data, db); } catch { return null; }
}

async function ghiLoiTuRequest(req, error, data = {}, db = null) { return ghiLoi(error, taoDuLieuRequest(req, data), db); }

async function ghiLoiTuRequestAnToan(req, error, data = {}, db = null) {
    try { return await ghiLoiTuRequest(req, error, data, db); } catch { return null; }
}

async function debug(nguon, thongDiep, duLieu = {}, data = {}) { 
    return ghi({ ...data, mucDo: MUC_DO_NHAT_KY.DEBUG, nguon, thongDiep, duLieu }); 
}

async function info(nguon, thongDiep, duLieu = {}, data = {}) { 
    return ghi({ ...data, mucDo: MUC_DO_NHAT_KY.INFO, nguon, thongDiep, duLieu }); 
}

async function warn(nguon, thongDiep, duLieu = {}, data = {}) { 
    return ghi({ ...data, mucDo: MUC_DO_NHAT_KY.WARN, nguon, thongDiep, duLieu }); 
}

async function security(nguon, thongDiep, duLieu = {}, data = {}) { 
    return ghi({ ...data, mucDo: MUC_DO_NHAT_KY.SECURITY, nguon, thongDiep, duLieu }); 
}

async function audit(nguon, thongDiep, duLieu = {}, data = {}) { 
    return ghi({ ...data, mucDo: MUC_DO_NHAT_KY.AUDIT, nguon, thongDiep, duLieu }); 
}

async function getTheoRequestId(requestId, gioiHan = 100) {
    const id = chuanHoaRequestId(requestId);
    if (!id) { throw new TypeError('Request ID phải là UUID hợp lệ.'); }
    return repository.getTheoRequestId(id, Number(gioiHan) || 100);
}

async function getTheoTraceId(traceId, gioiHan = 100) {
    const id = chuanHoaChuoi(traceId, 'Trace ID', 100, true);
    return repository.getTheoTraceId(id, Number(gioiHan) || 100);
}

async function getTheoCongViec(congViecId, gioiHan = 500) {
    const id = parseId(congViecId, 'ID công việc');
    if (!id) { throw new TypeError('ID công việc là bắt buộc.'); }
    return repository.getTheoCongViec(id, Number(gioiHan) || 500);
}

async function xoaHetHan(gioiHan = 5000) {
    const limit = Number(gioiHan);
    if (!Number.isSafeInteger(limit) || limit <= 0 || limit > 50000) { throw new TypeError('Giới hạn dọn nhật ký phải là số nguyên từ 1 đến 50000.'); }
    return repository.xoaHetHan(limit);
}

module.exports = {
    MUC_DO_NHAT_KY,
    DANH_SACH_MUC_DO,
    lamSachDuLieu,
    ghi,
    ghiAnToan,
    ghiTuRequest,
    ghiTuRequestAnToan,
    ghiLoi,
    ghiLoiAnToan,
    ghiLoiTuRequest,
    ghiLoiTuRequestAnToan,
    debug,
    info,
    warn,
    security,
    audit,
    getTheoRequestId,
    getTheoTraceId,
    getTheoCongViec,
    xoaHetHan
};