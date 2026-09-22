'use strict';

const service = require('./chinh-sach-han-muc.service');

function thanhCong(res, { statusCode = 200, message = null, data = null, meta = null } = {}) {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        meta,
        error: null
    });
}

async function getDanhSach(req, res, next) {
    try {
        const result = await service.getDanhSach(req.query);
        return thanhCong(res, {
            data: result.items,
            meta: {
                page: result.page,
                limit: result.limit,
                total: result.total,
                totalPages: Math.ceil(result.total / result.limit)
            }
        });
    } catch (error) {
        return next(error);
    }
}

async function getChiTiet(req, res, next) {
    try {
        const data = await service.getChiTiet(req.params.id);
        return thanhCong(res, { data });
    } catch (error) {
        return next(error);
    }
}

async function create(req, res, next) {
    try {
        const data = await service.create(req.body);
        return thanhCong(res, {
            statusCode: 201,
            message: 'Tạo chính sách hạn mức thành công.',
            data
        });
    } catch (error) {
        return next(error);
    }
}

async function update(req, res, next) {
    try {
        const data = await service.update(req.params.id, req.body);
        return thanhCong(res, {
            message: 'Cập nhật chính sách hạn mức thành công.',
            data
        });
    } catch (error) {
        return next(error);
    }
}

async function updateTrangThai(req, res, next) {
    try {
        const data = await service.updateTrangThai(req.params.id, req.body.active);
        return thanhCong(res, {
            message: data.active
                ? 'Kích hoạt chính sách hạn mức thành công.'
                : 'Ngừng áp dụng chính sách hạn mức thành công.',
            data
        });
    } catch (error) {
        return next(error);
    }
}

async function xoa(req, res, next) {
    try {
        await service.xoa(req.params.id);
        return thanhCong(res, {
            message: 'Xóa chính sách hạn mức thành công.'
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    getDanhSach,
    getChiTiet,
    create,
    update,
    updateTrangThai,
    xoa
};