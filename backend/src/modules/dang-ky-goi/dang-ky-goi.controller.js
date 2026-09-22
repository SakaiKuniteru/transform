'use strict';

const service = require('./dang-ky-goi.service');

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

async function getCuaToi(req, res, next) {
    try {
        const result = await service.getCuaToi(req.user.id, req.query);
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

async function getHienTai(req, res, next) {
    try {
        const data = await service.getHienTai(req.user.id);
        return thanhCong(res, { data });
    } catch (error) {
        return next(error);
    }
}

async function dangKy(req, res, next) {
    try {
        const data = await service.dangKy(req.user.id, req.body);
        const message = data.trangThai === 'HOAT_DONG'
            ? 'Đăng ký và kích hoạt gói dịch vụ thành công.'
            : 'Đăng ký gói dịch vụ thành công. Vui lòng hoàn tất thanh toán.';
        return thanhCong(res, {
            statusCode: 201,
            message,
            data
        });
    } catch (error) {
        return next(error);
    }
}

async function ganGoi(req, res, next) {
    try {
        const data = await service.ganGoi(req.body);
        return thanhCong(res, {
            statusCode: 201,
            message: 'Gán gói dịch vụ cho người dùng thành công.',
            data
        });
    } catch (error) {
        return next(error);
    }
}

async function kichHoat(req, res, next) {
    try {
        const data = await service.kichHoat(req.params.id, req.body);
        return thanhCong(res, {
            message: 'Kích hoạt gói dịch vụ thành công.',
            data
        });
    } catch (error) {
        return next(error);
    }
}

async function tamDung(req, res, next) {
    try {
        const data = await service.tamDung(req.params.id);
        return thanhCong(res, {
            message: 'Tạm dừng gói dịch vụ thành công.',
            data
        });
    } catch (error) {
        return next(error);
    }
}

async function tiepTuc(req, res, next) {
    try {
        const data = await service.tiepTuc(req.params.id);
        return thanhCong(res, {
            message: 'Tiếp tục gói dịch vụ thành công.',
            data
        });
    } catch (error) {
        return next(error);
    }
}

async function huyCuaToi(req, res, next) {
    try {
        const data = await service.huyCuaToi(req.params.id, req.user.id, req.body);
        return thanhCong(res, {
            message: 'Hủy gói dịch vụ thành công.',
            data
        });
    } catch (error) {
        return next(error);
    }
}

async function huyQuanTri(req, res, next) {
    try {
        const data = await service.huyQuanTri(req.params.id, req.user.id, req.body);
        return thanhCong(res, {
            message: 'Hủy đăng ký gói thành công.',
            data
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    getDanhSach,
    getChiTiet,
    getCuaToi,
    getHienTai,
    dangKy,
    ganGoi,
    kichHoat,
    tamDung,
    tiepTuc,
    huyCuaToi,
    huyQuanTri
};