'use strict';

const Joi = require('joi');

const {
    DANH_SACH_MA_HAN_MUC
} = require('../../constants/han-muc');

const nguoiDungIdSchema = Joi.number().integer().positive();
const phienKhachIdSchema = Joi.number().integer().positive();

const chuTheSchema = Joi.object({
    nguoiDungId: nguoiDungIdSchema,
    phienKhachId: phienKhachIdSchema
}).xor('nguoiDungId', 'phienKhachId');

const maHanhDongSchema = Joi.string().trim().uppercase().max(50).valid(...DANH_SACH_MA_HAN_MUC).required();

const soLuongSchema = Joi.number().integer().positive().required();

const thoiDiemSchema = Joi.date().iso();

const kiemTraSchema = chuTheSchema.keys({
    maHanhDong: maHanhDongSchema,
    soLuong: soLuongSchema,
    thoiDiem: thoiDiemSchema
});

const layTinhTrangSchema = chuTheSchema.keys({
    maHanhDong: maHanhDongSchema,
    thoiDiem: thoiDiemSchema
});

const hoanTraSchema = Joi.object({
    theoDoi: Joi.boolean().valid(true).required(),
    nguoiDungId: nguoiDungIdSchema.allow(null),
    phienKhachId: phienKhachIdSchema.allow(null),
    maHanhDong: maHanhDongSchema,
    donVi: Joi.string().valid('LAN', 'TEP', 'BYTE').required(),
    kyBatDau: Joi.date().iso().required(),
    kyKetThuc: Joi.date().iso().required(),
    soLuong: soLuongSchema
}).custom((value, helpers) => {
    const coNguoiDung = value.nguoiDungId !== null && value.nguoiDungId !== undefined;
    const coPhienKhach = value.phienKhachId !== null && value.phienKhachId !== undefined;
    if (coNguoiDung === coPhienKhach) { return helpers.error('any.custom'); }
    return value;
});

const paramsMaHanhDongSchema = Joi.object({
    maHanhDong: maHanhDongSchema
});

const paramsNguoiDungIdSchema = Joi.object({
    nguoiDungId: nguoiDungIdSchema.required()
});

const paramsNguoiDungMaHanhDongSchema = Joi.object({
    nguoiDungId: nguoiDungIdSchema.required(),
    maHanhDong: maHanhDongSchema
});

module.exports = {
    chuTheSchema,
    kiemTraSchema,
    layTinhTrangSchema,
    hoanTraSchema,
    paramsMaHanhDongSchema,
    paramsNguoiDungIdSchema,
    paramsNguoiDungMaHanhDongSchema
};