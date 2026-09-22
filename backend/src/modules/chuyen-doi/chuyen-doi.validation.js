'use strict';

const Joi = require('joi');
const { LOAI_CHUYEN_DOI, DANH_SACH_LOAI_CHUYEN_DOI_HO_TRO } = require('../../constants/loai-chuyen-doi');

const DANH_SACH_LOAI_BAT_BUOC_DINH_DANG_DICH = Object.freeze([
    LOAI_CHUYEN_DOI.CHUYEN_DINH_DANG,
    LOAI_CHUYEN_DOI.GIAI_MA,
    LOAI_CHUYEN_DOI.GIAI_NEN,
    LOAI_CHUYEN_DOI.TRICH_XUAT
]);

const paramsIdSchema = Joi.object({
    id: Joi.number().integer().positive().required()
});

const taoSchema = Joi.object({
    tepNguonId: Joi.number().integer().positive().required(),
    phienBanNguonId: Joi.number().integer().positive().optional(),
    loaiChuyenDoi: Joi.string().valid(...DANH_SACH_LOAI_CHUYEN_DOI_HO_TRO).required(),
    dinhDangDich: Joi.when('loaiChuyenDoi', {
        is: Joi.valid(...DANH_SACH_LOAI_BAT_BUOC_DINH_DANG_DICH),
        then: Joi.string().trim().max(50).required(),
        otherwise: Joi.string().trim().max(50).allow(null, '').optional()
    }),
    converterKey: Joi.string().trim().max(255).optional(),
    mucDoUuTien: Joi.number().integer().min(1).max(10).default(5),
    soLanThuToiDa: Joi.number().integer().min(1).max(10).default(3),
    khoaIdempotency: Joi.string().trim().max(128).optional(),
    tuyChon: Joi.object().unknown(true).default({})
});

const hoTroQuerySchema = Joi.object({
    loaiChuyenDoi: Joi.string().valid(...DANH_SACH_LOAI_CHUYEN_DOI_HO_TRO).optional(),
    dinhDangNguon: Joi.string().trim().max(50).optional(),
    dinhDangDich: Joi.string().trim().max(50).optional(),
    nhomXuLy: Joi.string().trim().max(50).optional()
});

module.exports = {
    paramsIdSchema,
    taoSchema,
    hoTroQuerySchema
};