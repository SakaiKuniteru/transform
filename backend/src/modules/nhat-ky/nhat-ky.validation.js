'use strict';
const Joi = require('joi');
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LEVELS = [ 'DEBUG', 'INFO', 'WARN', 'ERROR', 'SECURITY', 'AUDIT' ];

const danhSachSchema = Joi.object({
    requestId: Joi.string().trim().pattern(UUID_PATTERN).optional(),
    traceId: Joi.string().trim().max(100).optional(),
    congViecId: Joi.number().integer().positive().optional(),
    nguoiDungId: Joi.number().integer().positive().optional(),
    event: Joi.string().trim().max(100).optional(),
    level: Joi.string().trim().uppercase().valid(...LEVELS).optional(),
    tuNgay: Joi.date().iso().optional(),
    denNgay: Joi.date().iso().min(Joi.ref('tuNgay')).optional(),
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20)
});

const requestParamsSchema = Joi.object({
    requestId: Joi.string().trim().pattern(UUID_PATTERN).required()
});

const traceParamsSchema = Joi.object({
    traceId: Joi.string().trim().max(100).required()
});

const congViecParamsSchema = Joi.object({
    congViecId: Joi.number().integer().positive().required()
});

module.exports = {
    danhSachSchema,
    requestParamsSchema,
    traceParamsSchema,
    congViecParamsSchema
};