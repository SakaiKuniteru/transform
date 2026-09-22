'use strict';

const service = require('./lich-su.service');
const MA_LOI = require('../../constants/ma-loi');
const { loiChuaXacThuc } = require('../../utils/loi');

function thanhCong(res, { statusCode = 200, message = null, data = null } = {}) { return res.status(statusCode).json({ success: true, message, data, error: null }); }

function layChuThe(req) {
    if (req.user?.id) { return { nguoiDungId: req.user.id }; }
    if (req.phienKhach?.id || req.phienKhachId) { return { phienKhachId: req.phienKhach?.id || req.phienKhachId }; }
    throw loiChuaXacThuc('Không xác định được chủ sở hữu lịch sử.', MA_LOI.CHUA_XAC_THUC);
}

async function getCuaToi(req, res, next) {
    try { return thanhCong(res, { data: await service.getDanhSach(layChuThe(req), req.query) }); } catch (error) { return next(error); }
}

async function getChiTiet(req, res, next) {
    try { return thanhCong(res, { data: await service.getChiTiet(req.params.id, layChuThe(req)) }); } catch (error) { return next(error); }
}

module.exports = {
    getCuaToi,
    getChiTiet
};