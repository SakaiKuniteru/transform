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

const capNhatSchema = Joi.object({
    tenTep: Joi.string().trim().min(1).max(255).optional(),
    moTa: Joi.string().trim().max(5000).allow('', null).optional(),
    thuocTinh: Joi.object().optional()
}).min(1);

module.exports = {
    paramsIdSchema,
    danhSachSchema,
    capNhatSchema
};