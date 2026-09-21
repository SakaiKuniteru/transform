'use strict';

const service = require('./chuyen-doi.service');
const MA_LOI = require('../../constants/ma-loi');
const { loiChuaXacThuc } = require('../../utils/loi');

function thanhCong(res, { statusCode = 200, message = null, data = null } = {}) { return res.status(statusCode).json({ success: true, message, data, error: null }); }

function layChuThe(req) {
    if (req.user?.id) { return { nguoiDungId: req.user.id }; }
    if (req.phienKhach?.id || req.phienKhachId) { return { phienKhachId: req.phienKhach?.id || req.phienKhachId }; }
    throw loiChuaXacThuc('Không xác định được chủ sở hữu yêu cầu chuyển đổi.', MA_LOI.KHONG_XAC_DINH_DUOC_CHU_SO_HUU_CONG_VIEC);
}

async function getHoTro(req, res, next) {
    try { return thanhCong(res, { data: await service.getHoTro(req.query) }); } catch (error) { return next(error); }
}

async function tao(req, res, next) {
    try {
        const data = await service.taoYeuCau({ ...req.body, khoaIdempotency: req.get('idempotency-key') || req.body.khoaIdempotency || null }, layChuThe(req));
        return thanhCong(res, { statusCode: data.daTonTai ? 200 : 201, message: data.daTonTai ? 'Yêu cầu chuyển đổi đã tồn tại.' : 'Đã tạo yêu cầu chuyển đổi.', data });
    } catch (error) { return next(error); }
}

async function getChiTiet(req, res, next) {
    try { return thanhCong(res, { data: await service.getChiTiet(req.params.id, layChuThe(req)) }); } catch (error) { return next(error); }
}

module.exports = {
    getHoTro,
    tao,
    getChiTiet
};