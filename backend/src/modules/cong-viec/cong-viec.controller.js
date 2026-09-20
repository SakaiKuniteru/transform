'use strict';

const service = require('./cong-viec.service');
const MA_LOI = require('../../constants/ma-loi');
const { loiChuaXacThuc } = require('../../utils/loi');

function thanhCong(res, { statusCode = 200, message = null, data = null } = {}) {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        error: null
    });
}

function layChuThe(req) {
    if (req.user?.id) {
        return {
            nguoiDungId: req.user.id
        };
    }
    if (req.phienKhach?.id || req.phienKhachId) {
        return {
            phienKhachId: req.phienKhach?.id || req.phienKhachId
        };
    }
    throw loiChuaXacThuc('Không xác định được chủ sở hữu công việc.', MA_LOI.KHONG_XAC_DINH_DUOC_CHU_SO_HUU_CONG_VIEC);
}

async function getCuaToi(req, res, next) {
    try {
        const data = await service.getDanhSach(layChuThe(req), req.query);
        return thanhCong(res, { data });
    } catch (error) {
        return next(error);
    }
}

async function getChiTiet(req, res, next) {
    try {
        const data = await service.getChiTiet(req.params.id, layChuThe(req));
        return thanhCong(res, { data });
    } catch (error) {
        return next(error);
    }
}

async function huy(req, res, next) {
    try {
        const data = await service.huy(req.params.id, layChuThe(req));
        return thanhCong(res, {
            message: data.trangThai === 'DA_HUY' ? 'Hủy công việc thành công.' : 'Đã gửi yêu cầu hủy công việc.',
            data
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    getCuaToi,
    getChiTiet,
    huy
};