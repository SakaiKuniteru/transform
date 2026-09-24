'use strict';
const { taoViewContext } = require('../../../core/views/view-context');
const { CONG_CU, layCongCu } = require('./cong-cu.config');
const service = require('./cong-cu.service');
function trang(req, res, tenView, duLieu = {}) { return res.render(`pages/public/${tenView}`, taoViewContext(req, res, { layout: 'public', ...duLieu })); }
function index(req, res) { return trang(req, res, 'home', { page: { title: 'Chuyển đổi tệp dễ dàng | Transform', description: 'Công cụ chuyển đổi tệp trực tuyến, có thể bắt đầu mà không cần đăng nhập.' }, congCu: CONG_CU }); }
async function congCu(req, res, next) { try { const tool = layCongCu(req.params.slug); if (!tool) { return next(); } const khaDung = await service.kiemTraHoTro(req, tool, tool.nguon[0]).catch(() => false); return trang(req, res, 'cong-cu', { page: { title: `${tool.ten} | Transform`, description: tool.moTa }, tool, khaDung, congCu: CONG_CU }); } catch (error) { return next(error); } }
async function khaDung(req, res) {
    try {
        const tool = service.batBuocCongCu(req.query.tool);
        const dinhDang = String(req.query.dinhDang || tool.nguon[0] || '').toLowerCase();
        if (!tool.nguon.includes(dinhDang)) { return res.status(400).json({ success: false, message: 'Định dạng không phù hợp.', data: { khaDung: false } }); }
        const available = await service.kiemTraHoTro(req, tool, dinhDang);
        return res.json({ success: true, data: { khaDung: available } });
    } catch (error) { return res.status(Number(error.statusCode) >= 400 && Number(error.statusCode) < 600 ? Number(error.statusCode) : 503).json({ success: false, message: 'Chưa kiểm tra được dịch vụ chuyển đổi.', data: { khaDung: false } }); }
}
async function upload(req, res, next) { try { const tool = service.batBuocCongCu(req.query.tool || req.body?.tool); const tep = await service.upload(req); return res.json({ success: true, message: 'Đã tải tệp lên.', data: { tepId: tep.id, redirectUrl: `/cong-cu/xac-nhan?tepId=${tep.id}&tool=${encodeURIComponent(tool.slug)}` } }); } catch (error) { return next(error); } }
async function xacNhan(req, res, next) { try { const tool = service.batBuocCongCu(req.query.tool); const tep = await service.layTep(req, req.query.tepId); const dinhDang = String(tep?.phienBanHienTai?.dinhDang || tep?.phienBanHienTai?.phanMoRong || '').toLowerCase(); const dungDinhDang = tool.nguon.includes(dinhDang); const khaDung = dungDinhDang ? await service.kiemTraHoTro(req, tool, dinhDang) : false; return trang(req, res, 'xac-nhan', { page: { title: `Xác nhận ${tool.ten} | Transform`, noIndex: true }, tool, tep, hopLe: dungDinhDang && khaDung, dungDinhDang, khaDung, dinhDang }); } catch (error) { return next(error); } }
async function tao(req, res, next) { try { const congViec = await service.taoCongViec(req, req.body); return res.redirect(303, `/cong-cu/cong-viec/${congViec.id}`); } catch (error) { return next(error); } }
async function chiTiet(req, res, next) { try { const congViec = await service.layCongViec(req, req.params.id); return trang(req, res, 'cong-viec', { page: { title: `Công việc #${congViec.id} | Transform`, noIndex: true }, congViec, canLamMoi: ![ 'HOAN_THANH', 'THAT_BAI', 'DA_HUY', 'HET_HAN' ].includes(congViec.trangThai) }); } catch (error) { return next(error); } }
async function trangThai(req, res, next) { try { const congViec = await service.layCongViec(req, req.params.id); return res.json({ success: true, data: { id: congViec.id, trangThai: congViec.trangThai, tienTrinh: congViec.tienTrinh, tepKetQuaId: congViec.tepKetQuaId || null, thongBao: congViec.thongBao || null } }); } catch (error) { return next(error); } }
async function taiXuong(req, res, next) { try { return await service.taiXuong(req, req.params.id, res); } catch (error) { if (res.headersSent) { res.destroy(error); return; } return next(error); } }
module.exports = {
    index,
    congCu,
    khaDung,
    upload,
    xacNhan,
    tao,
    chiTiet,
    trangThai,
    taiXuong
};
