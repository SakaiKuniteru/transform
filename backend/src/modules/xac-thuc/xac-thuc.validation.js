'use strict';

const Joi = require('joi');
const env = require('../../config/env');


const OTP_LENGTH = Number(env.otp?.length || 6);


const emailSchema = Joi.string()
    .trim()
    .lowercase()
    .email({
        tlds: {
            allow: false
        }
    })
    .max(320);


const tenDangNhapSchema = Joi.string()
    .trim()
    .lowercase()
    .min(3)
    .max(100)
    .pattern(/^[a-z0-9._-]+$/)
    .allow(null, '');


const hoTenSchema = Joi.string()
    .trim()
    .min(2)
    .max(255);


const matKhauSchema = Joi.string()
    .min(env.baoMat.passwordMinLength)
    .max(env.baoMat.passwordMaxLength)
    .pattern(/[a-z]/)
    .pattern(/[A-Z]/)
    .pattern(/[0-9]/)
    .pattern(/[^A-Za-z0-9]/);


const maOtpSchema = Joi.string()
    .pattern(new RegExp(`^\\d{${OTP_LENGTH}}$`));


const dangKySchema = Joi.object({
    email: emailSchema.required(),
    tenDangNhap: tenDangNhapSchema.default(null),
    hoTen: hoTenSchema.required(),
    matKhau: matKhauSchema.required()
}).required();


const xacThucEmailSchema = Joi.object({
    email: emailSchema.required(),
    maOtp: maOtpSchema.required()
}).required();


const guiLaiOtpSchema = Joi.object({
    email: emailSchema.required()
}).required();


const dangNhapSchema = Joi.object({
    tenDangNhap: Joi.string().trim().min(3).max(320).required(),
    matKhau: Joi.string().min(1).max(128).required()
}).required();


const quenMatKhauSchema = Joi.object({
    email: emailSchema.required()
}).required();


const xacThucOtpDatLaiMatKhauSchema = Joi.object({
    email: emailSchema.required(),
    maOtp: maOtpSchema.required()
}).required();


const datLaiMatKhauSchema = Joi.object({
    resetToken: Joi.string().trim().min(20).required(),
    matKhauMoi: matKhauSchema.required()
}).required();


const doiMatKhauSchema = Joi.object({
    matKhauHienTai: Joi.string().min(1).max(128).required(),
    matKhauMoi: matKhauSchema.required()
}).required();


module.exports = {
    dangKySchema,
    xacThucEmailSchema,
    guiLaiOtpSchema,
    dangNhapSchema,
    quenMatKhauSchema,
    xacThucOtpDatLaiMatKhauSchema,
    datLaiMatKhauSchema,
    doiMatKhauSchema
};