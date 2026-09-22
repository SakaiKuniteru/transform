'use strict';

const Joi = require('joi');

const paramsIdSchema = Joi.object({
    id: Joi.number().integer().positive().required()
});

const danhSachSchema = Joi.object({
    trang: Joi.number().integer().min(1).default(1),
    gioiHan: Joi.number().integer().min(1).max(100).default(20),
    loaiSuKien: Joi.string().trim().uppercase().max(100).optional(),
    nguon: Joi.string().trim().uppercase().max(50).optional(),
    congViecId: Joi.number().integer().positive().optional(),
    tepId: Joi.number().integer().positive().optional(),
    phienBanTepId: Joi.number().integer().positive().optional(),
    tuKhoa: Joi.string().trim().max(255).allow('').default(''),
    tuNgay: Joi.date().iso().optional(),
    denNgay: Joi.date().iso().min(Joi.ref('tuNgay')).optional()
});

module.exports = {
    paramsIdSchema,
    danhSachSchema
};