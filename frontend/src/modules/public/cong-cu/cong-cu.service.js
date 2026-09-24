'use strict';
const crypto = require('node:crypto');
const backendClient = require('../../../core/api/backend-client');
const apiStream = require('../../../core/api/api-stream');
const sessionService = require('../../../core/auth/session.service');
const { layCongCu } = require('./cong-cu.config');
function taoLoi(statusCode, message, code) { const error = new Error(message); error.statusCode = statusCode; error.code = code; error.expose = true; return error; }
function layId(value) { const id = Number(value); if (!Number.isSafeInteger(id) || id < 1) { throw taoLoi(400, 'ID không hợp lệ.', 'ID_KHONG_HOP_LE'); } return id; }
function batBuocCongCu(value) { const tool = layCongCu(value); if (!tool) { throw taoLoi(404, 'Công cụ không tồn tại.', 'CONG_CU_KHONG_TIM_THAY'); } return tool; }
function taoBackendOptions(req, options = {}) { return { ...options, accessToken: sessionService.layAccessToken(req), cookie: sessionService.layCookieBackend(req), requestId: req.requestId || null, headers: { 'User-Agent': String(req.get('user-agent') || '').slice(0, 400), ...options.headers } }; }
async function luuCookie(req, headers) { sessionService.dongBoCookieBackend(req, headers); await new Promise((resolve, reject) => req.session.save((error) => error ? reject(error) : resolve())); }
async function guiBackend(req, options) { const response = await backendClient.thucThiRaw(taoBackendOptions(req, { ...options, onResponse: async (result) => luuCookie(req, result.headers) })); if (response.data?.success !== true) { throw taoLoi(502, 'Backend trả về kết quả không hợp lệ.', 'BACKEND_RESPONSE_KHONG_HOP_LE'); } return response.data.data; }
async function upload(req) {
    const contentType = String(req.get('content-type') || '');
    if (!/^multipart\/form-data\s*;/i.test(contentType)) { throw taoLoi(415, 'Hãy chọn tệp để tải lên.', 'YEU_CAU_MULTIPART'); }
    const headers = { 'Content-Type': contentType };
    if (req.get('content-length')) { headers['Content-Length'] = req.get('content-length'); }
    const teps = await guiBackend(req, { method: 'POST', url: '/tep/upload', data: req, headers, timeout: 300000 });
    if (!Array.isArray(teps) || !teps[0]?.id) { throw taoLoi(502, 'Backend chưa trả về thông tin tệp.', 'UPLOAD_KHONG_CO_TEP'); }
    return teps[0];
}
async function layTep(req, id) { return guiBackend(req, { method: 'GET', url: `/tep/${layId(id)}` }); }
async function kiemTraHoTro(req, tool, dinhDang) {
    const query = new URLSearchParams({ loaiChuyenDoi: tool.loaiChuyenDoi, dinhDangNguon: dinhDang });
    if (tool.dinhDangDich) { query.set('dinhDangDich', tool.dinhDangDich); }
    const danhSach = await guiBackend(req, { method: 'GET', url: `/chuyen-doi/ho-tro?${query.toString()}` });
    return Array.isArray(danhSach) && danhSach.some((converter) => converter.khaDung === true);
}
async function taoCongViec(req, values) {
    const tool = batBuocCongCu(values.tool);
    const tep = await layTep(req, values.tepId);
    const dinhDang = String(tep?.phienBanHienTai?.dinhDang || tep?.phienBanHienTai?.phanMoRong || '').toLowerCase();
    if (!tool.nguon.includes(dinhDang)) { throw taoLoi(400, `Công cụ ${tool.ten} không hỗ trợ tệp ${dinhDang || 'này'}.`, 'DINH_DANG_NGUON_KHONG_HOP_LE'); }
    if (!await kiemTraHoTro(req, tool, dinhDang)) { throw taoLoi(422, 'Bộ xử lý cho tác vụ này chưa khả dụng trên Backend đang chạy. Vui lòng kiểm tra dịch vụ chuyển đổi hoặc cấu hình provider.', 'BO_XU_LY_CHUA_KHA_DUNG'); }
    const khoaIdempotency = crypto.randomUUID();
    const tuyChon = {};
    if (tool.tuyChonLoai === 'dich') {
        const ngonNguDich = String(values.ngonNguDich || '').trim().toLowerCase();
        if (!/^[a-z]{2,3}(?:-[a-z]{2,4})?$/.test(ngonNguDich)) { throw taoLoi(400, 'Hãy chọn ngôn ngữ đích hợp lệ.', 'NGON_NGU_DICH_KHONG_HOP_LE'); }
        tuyChon.ngonNguDich = ngonNguDich;
        tuyChon.ngonNguNguon = 'auto';
    }
    if (tool.tuyChonLoai === 'ai') {
        const chiDan = String(values.chiDan || '').trim();
        if (chiDan.length > 4000) { throw taoLoi(400, 'Chỉ dẫn quá dài.', 'CHI_DAN_QUA_DAI'); }
        if (chiDan) { tuyChon.chiDan = chiDan; }
    }
    if (tool.tuyChonLoai === 'ocr') {
        const ngonNgu = String(values.ngonNgu || 'vie+eng');
        if (!['vie+eng', 'vie', 'eng'].includes(ngonNgu)) { throw taoLoi(400, 'Ngôn ngữ OCR chưa được hỗ trợ.', 'NGON_NGU_OCR_KHONG_HOP_LE'); }
        tuyChon.ngonNgu = ngonNgu;
    }
    const data = { tepNguonId: layId(tep.id), loaiChuyenDoi: tool.loaiChuyenDoi, dinhDangDich: tool.dinhDangDich, khoaIdempotency, tuyChon };
    const result = await guiBackend(req, { method: 'POST', url: '/chuyen-doi', data, headers: { 'Idempotency-Key': khoaIdempotency } });
    if (!result?.congViec?.id) { throw taoLoi(502, 'Backend chưa trả về công việc chuyển đổi.', 'CONG_VIEC_KHONG_HOP_LE'); }
    return result.congViec;
}
async function layCongViec(req, id) { const data = await guiBackend(req, { method: 'GET', url: `/cong-viec/${layId(id)}` }); if (!data?.id) { throw taoLoi(502, 'Backend chưa trả về công việc hợp lệ.', 'CONG_VIEC_KHONG_HOP_LE'); } return data; }
async function taiXuong(req, id, res) { const response = await apiStream.layStream(taoBackendOptions(req, { url: `/tep/${layId(id)}/tai-xuong` })); await luuCookie(req, response.headers); await apiStream.chuyenStream(response, res); }
module.exports = {
    layId,
    batBuocCongCu,
    kiemTraHoTro,
    taoBackendOptions,
    upload,
    layTep,
    taoCongViec,
    layCongViec,
    taiXuong
};
