'use strict';

const Joi = require('joi');
const {
    DANH_SACH_TRANG_THAI_CONG_VIEC
} = require('../../constants/trang-thai-cong-viec');

const paramsIdSchema = Joi.object({
    id: Joi.number().integer().positive().required()
});

const danhSachSchema = Joi.object({
    trang: Joi.number().integer().min(1).default(1),
    gioiHan: Joi.number().integer().min(1).max(100).default(20),
    trangThai: Joi.string().valid(...DANH_SACH_TRANG_THAI_CONG_VIEC).optional(),
    loaiCongViec: Joi.string().trim().max(50).optional(),
    tuKhoa: Joi.string().trim().max(255).allow('').default(''),
    tuNgay: Joi.date().iso().optional(),
    denNgay: Joi.date().iso().min(Joi.ref('tuNgay')).optional()
});

const danhSachQuanTriSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    nguoiDungId: Joi.number().integer().positive().optional(),
    trangThai: Joi.string().valid(...DANH_SACH_TRANG_THAI_CONG_VIEC).optional(),
    loaiCongViec: Joi.string().trim().max(50).optional(),
    tuKhoa: Joi.string().trim().max(255).allow('').default(''),
    tuNgay: Joi.date().iso().optional(),
    denNgay: Joi.date().iso().min(Joi.ref('tuNgay')).optional()
});

module.exports = {
    paramsIdSchema,
    danhSachSchema,
    danhSachQuanTriSchema
};