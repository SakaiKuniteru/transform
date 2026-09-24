'use strict';

const Joi = require('joi');

const idSchema = Joi.number().integer().positive().required();

const paramsIdSchema = Joi.object({
    id: idSchema
});

const danhSachSchema = Joi.object({
    trang: Joi.number().integer().min(1).default(1),
    gioiHan: Joi.number().integer().min(1).max(100).default(20),
    tuKhoa: Joi.string().trim().max(255).allow('').default(''),
    trangThai: Joi.string().valid('HOAT_DONG', 'HET_HAN', 'DA_XOA').optional()
});

const danhSachQuanTriSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    tuKhoa: Joi.string().trim().max(255).allow('').default(''),
    nguoiDungId: Joi.number().integer().positive().optional(),
    trangThai: Joi.string().valid('HOAT_DONG', 'HET_HAN', 'DA_XOA').optional(),
    dinhDang: Joi.string().trim().max(50).allow('').default(''),
    tuNgay: Joi.date().iso().optional(),
    denNgay: Joi.date().iso().min(Joi.ref('tuNgay')).optional()
});

const capNhatSchema = Joi.object({
    tenTep: Joi.string().trim().min(1).max(255).optional(),
    moTa: Joi.string().trim().max(5000).allow('', null).optional(),
    thuocTinh: Joi.object().optional()
}).min(1);

module.exports = {
    paramsIdSchema,
    danhSachSchema,
    danhSachQuanTriSchema,
    capNhatSchema
};