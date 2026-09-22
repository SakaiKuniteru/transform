'use strict';

const Joi = require('joi');
const env = require('../../config/env');

const LOAI_TAI_KHOAN = Object.freeze([
    'NGUOI_DUNG',
    'QUAN_TRI'
]);
const TRANG_THAI = Object.freeze([
    'HOAT_DONG',
    'TAM_KHOA',
    'VO_HIEU_HOA'
]);

const idSchema = Joi.number().integer().positive().required();
const emailSchema = Joi.string().trim().lowercase().email({ tlds: { allow: false } }).max(320);
const tenDangNhapSchema = Joi.string()
    .trim()
    .lowercase()
    .min(3)
    .max(100)
    .pattern(/^[a-z0-9._-]+$/)
    .allow(null, '');
const hoTenSchema = Joi.string().trim().min(2).max(255);
const matKhauSchema = Joi.string()
    .min(env.baoMat.passwordMinLength)
    .max(env.baoMat.passwordMaxLength)
    .pattern(/[a-z]/)
    .pattern(/[A-Z]/)
    .pattern(/[0-9]/)
    .pattern(/[^A-Za-z0-9]/);
const caiDatSchema = Joi.object().unknown(true);

const idParamsSchema = Joi.object({
    id: idSchema
}).required();

const danhSachQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    tuKhoa: Joi.string().trim().max(255).allow('', null).default(null),
    loaiTaiKhoan: Joi.string().valid(...LOAI_TAI_KHOAN).allow(null).default(null),
    trangThai: Joi.string().valid(...TRANG_THAI).allow(null).default(null)
}).required();

const taoMoiSchema = Joi.object({
    email: emailSchema.required(),
    tenDangNhap: tenDangNhapSchema.default(null),
    hoTen: hoTenSchema.required(),
    matKhau: matKhauSchema.required(),
    loaiTaiKhoan: Joi.string().valid(...LOAI_TAI_KHOAN).default('NGUOI_DUNG'),
    trangThai: Joi.string().valid(...TRANG_THAI).default('HOAT_DONG'),
    emailDaXacThuc: Joi.boolean().default(false),
    caiDat: caiDatSchema.default({})
}).required();

const capNhatSchema = Joi.object({
    email: emailSchema,
    tenDangNhap: tenDangNhapSchema,
    hoTen: hoTenSchema,
    loaiTaiKhoan: Joi.string().valid(...LOAI_TAI_KHOAN),
    caiDat: caiDatSchema
})
    .min(1)
    .required();

const capNhatHienTaiSchema = Joi.object({
    tenDangNhap: tenDangNhapSchema,
    hoTen: hoTenSchema,
    caiDat: caiDatSchema
})
    .min(1)
    .required();

const capNhatTrangThaiSchema = Joi.object({
    trangThai: Joi.string().valid(...TRANG_THAI).required()
}).required();

module.exports = {
    LOAI_TAI_KHOAN,
    TRANG_THAI,
    idParamsSchema,
    danhSachQuerySchema,
    taoMoiSchema,
    capNhatSchema,
    capNhatHienTaiSchema,
    capNhatTrangThaiSchema
};