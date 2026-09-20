'use strict';

const { pipeline } = require('node:stream/promises');
const service = require('./tep.service');
const MA_LOI = require('../../constants/ma-loi');
const { loiChuaXacThuc } = require('../../utils/loi');
const {
    layDanhSachTep,
    xoaTepTamTrongRequest
} = require('../../middlewares/upload');
const {
    hoanTraHanMucUpload
} = require('../../middlewares/kiem-tra-han-muc-upload');

function thanhCong(res, { statusCode = 200, message = null, data = null } = {}) {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        error: null
    });
}

function layChuThe(req) {
    if (req.uploadPolicy?.chuThe?.nguoiDungId) {
        return {
            nguoiDungId: req.uploadPolicy.chuThe.nguoiDungId
        };
    }
    if (req.uploadPolicy?.chuThe?.phienKhachId) {
        return {
            phienKhachId: req.uploadPolicy.chuThe.phienKhachId
        };
    }
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
    throw loiChuaXacThuc('Không xác định được chủ sở hữu tệp.', MA_LOI.KHONG_XAC_DINH_DUOC_CHU_SO_HUU_TEP);
}

async function upload(req, res, next) {
    try {
        const danhSachFile = layDanhSachTep(req);
        const data = await service.upload(danhSachFile, layChuThe(req));
        await xoaTepTamTrongRequest(req);
        req.uploadHanMuc = null;
        return thanhCong(res, {
            statusCode: 201,
            message: 'Tải tệp lên thành công.',
            data
        });
    } catch (error) {
        try {
            await hoanTraHanMucUpload(req);
        } catch (hoanTraError) {
            error.hoanTraHanMucError = hoanTraError;
        }
        await xoaTepTamTrongRequest(req);
        return next(error);
    }
}

async function getDanhSach(req, res, next) {
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

async function capNhat(req, res, next) {
    try {
        const data = await service.capNhat(req.params.id, layChuThe(req), req.body);
        return thanhCong(res, {
            message: 'Cập nhật thông tin tệp thành công.',
            data
        });
    } catch (error) {
        return next(error);
    }
}

async function taiXuong(req, res, next) {
    try {
        const data = await service.getTaiXuong(req.params.id, layChuThe(req));
        const tenTep = data.tep.tenTep || data.phienBan.tenTep || 'tep';
        res.status(200);
        res.setHeader('Content-Type', data.phienBan.mimeType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(tenTep)}`);
        if (Number.isSafeInteger(data.phienBan.kichThuocBytes) && data.phienBan.kichThuocBytes >= 0) {
            res.setHeader('Content-Length', String(data.phienBan.kichThuocBytes));
        }
        await pipeline(data.stream, res);
    } catch (error) {
        if (res.headersSent) {
            res.destroy(error);
            return;
        }
        return next(error);
    }
}

async function xoa(req, res, next) {
    try {
        const data = await service.xoa(req.params.id, layChuThe(req));
        return thanhCong(res, {
            message: 'Xóa tệp thành công.',
            data
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    upload,
    getDanhSach,
    getChiTiet,
    capNhat,
    taiXuong,
    xoa
};