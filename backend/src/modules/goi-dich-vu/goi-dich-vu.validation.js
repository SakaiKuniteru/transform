'use strict';

const Joi = require('joi');

const {
    CHU_KY_GOI_DICH_VU,
    DANH_SACH_CHU_KY_GOI_DICH_VU
} = require('../../constants/trang-thai-goi');

const idSchema = Joi.number().integer().positive().required();
const maSchema = Joi.string()
    .trim()
    .uppercase()
    .max(50)
    .pattern(/^[A-Z0-9_-]+$/)
    .required();

const tenSchema = Joi.string().trim().min(1).max(255).required();
const moTaSchema = Joi.string().trim().allow('', null);
const giaSchema = Joi.number().precision(2).min(0).max(9999999999999999.99);
const tienTeSchema = Joi.string().trim().uppercase().length(3).pattern(/^[A-Z]{3}$/);
const chuKySchema = Joi.string().valid(...DANH_SACH_CHU_KY_GOI_DICH_VU);
const soChuKySchema = Joi.number().integer().positive();
const thuTuSchema = Joi.number().integer().min(0);
const metadataSchema = Joi.object().unknown(true);

const taoMoiSchema = Joi.object({
    ma: maSchema,
    ten: tenSchema,
    moTa: moTaSchema.default(null),
    gia: giaSchema.default(0),
    tienTe: tienTeSchema.default('VND'),
    yeuCauThanhToan: Joi.boolean().default(true),
    chuKy: chuKySchema.default(CHU_KY_GOI_DICH_VU.THANG),
    soChuKy: soChuKySchema.default(1),
    thuTu: thuTuSchema.default(0),
    active: Joi.boolean().default(true),
    metadata: metadataSchema.default({})
}).custom((value, helpers) => {
    if (value.yeuCauThanhToan === false && Number(value.gia) !== 0) {
        return helpers.error('any.custom', { message: 'Gói không yêu cầu thanh toán phải có giá bằng 0.' });
    }
    if (value.chuKy === CHU_KY_GOI_DICH_VU.MOT_LAN) { value.soChuKy = 1; }
    return value;
});

const capNhatSchema = Joi.object({
    ma: maSchema.optional(),
    ten: tenSchema.optional(),
    moTa: moTaSchema.optional(),
    gia: giaSchema.optional(),
    tienTe: tienTeSchema.optional(),
    yeuCauThanhToan: Joi.boolean().optional(),
    chuKy: chuKySchema.optional(),
    soChuKy: soChuKySchema.optional(),
    thuTu: thuTuSchema.optional(),
    active: Joi.boolean().optional(),
    metadata: metadataSchema.optional()
}).min(1);

const capNhatTrangThaiSchema = Joi.object({
    active: Joi.boolean().required()
});

const paramsIdSchema = Joi.object({
    id: idSchema
});

const danhSachSchema = Joi.object({
    tuKhoa: Joi.string().trim().allow('').max(255),
    active: Joi.boolean(),
    chuKy: chuKySchema,
    yeuCauThanhToan: Joi.boolean(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('id', 'ma', 'ten', 'gia', 'thuTu', 'createdAt').default('thuTu'),
    sortOrder: Joi.string().valid('asc', 'desc').lowercase().default('asc')
});

module.exports = {
    taoMoiSchema,
    capNhatSchema,
    capNhatTrangThaiSchema,
    paramsIdSchema,
    danhSachSchema
};