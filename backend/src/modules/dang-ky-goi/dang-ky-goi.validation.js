'use strict';

const Joi = require('joi');

const TRANG_THAI = [
    'CHO_THANH_TOAN',
    'HOAT_DONG',
    'TAM_DUNG',
    'HET_HAN',
    'DA_HUY'
];

const NGUON_KICH_HOAT = [
    'THANH_TOAN',
    'QUAN_TRI',
    'KHUYEN_MAI',
    'HE_THONG'
];

const idSchema = Joi.number().integer().positive().required();

const paramsIdSchema = Joi.object({
    id: idSchema
});

const dangKySchema = Joi.object({
    goiDichVuId: idSchema,
    tuDongGiaHan: Joi.boolean().default(false)
});

const ganGoiSchema = Joi.object({
    nguoiDungId: idSchema,
    goiDichVuId: idSchema,
    batDauLuc: Joi.date().iso().allow(null),
    thayTheGoiHienTai: Joi.boolean().default(false),
    metadata: Joi.object().unknown(true).default({})
});

const kichHoatSchema = Joi.object({
    maGiaoDich: Joi.string().trim().max(255).allow('', null),
    batDauLuc: Joi.date().iso().allow(null),
    thayTheGoiHienTai: Joi.boolean().default(false)
});

const huySchema = Joi.object({
    lyDo: Joi.string().trim().max(500).allow('', null)
});

const danhSachSchema = Joi.object({
    nguoiDungId: Joi.number().integer().positive(),
    goiDichVuId: Joi.number().integer().positive(),
    trangThai: Joi.string().valid(...TRANG_THAI),
    nguonKichHoat: Joi.string().valid(...NGUON_KICH_HOAT),
    tuKhoa: Joi.string().trim().max(255).allow(''),
    tuNgay: Joi.date().iso(),
    denNgay: Joi.date().iso(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('id', 'createdAt', 'batDauLuc', 'hetHanLuc', 'giaThanhToan').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').lowercase().default('desc')
});

const danhSachCuaToiSchema = Joi.object({
    trangThai: Joi.string().valid(...TRANG_THAI),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
});

module.exports = {
    paramsIdSchema,
    dangKySchema,
    ganGoiSchema,
    kichHoatSchema,
    huySchema,
    danhSachSchema,
    danhSachCuaToiSchema
};