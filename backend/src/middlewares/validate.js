'use strict';

const Joi = require('joi');
const MA_LOI = require('../constants/ma-loi');
const { loiYeuCau } = require('../utils/loi');
const VI_TRI_DU_LIEU = Object.freeze({
    BODY: 'body',
    PARAMS: 'params',
    QUERY: 'query'
});
const CAC_VI_TRI_HOP_LE = new Set(Object.values(VI_TRI_DU_LIEU));
const TUY_CHON_MAC_DINH = Object.freeze({
    abortEarly: false,
    allowUnknown: false,
    convert: true,
    stripUnknown: false
});

function kiemTraSchema(schema) {
    if (!Joi.isSchema(schema)) { throw new TypeError('Schema validation phải là Joi schema hợp lệ.'); }
}

function kiemTraViTri(viTri) {
    if (!CAC_VI_TRI_HOP_LE.has(viTri)) { throw new TypeError(`Vị trí validation không hợp lệ: ${viTri}.`); }
}

function layDuLieu(req, viTri) {
    if (viTri === VI_TRI_DU_LIEU.BODY) { return req.body ?? {}; }
    if (viTri === VI_TRI_DU_LIEU.PARAMS) { return req.params ?? {}; }
    if (viTri === VI_TRI_DU_LIEU.QUERY) { return req.query ?? {}; }
    return {};
}

function ganDuLieuDaValidate(req, viTri, duLieu) {
    if (!req.validated || typeof req.validated !== 'object') { req.validated = {}; }
    req.validated[viTri] = duLieu;
    if (viTri === VI_TRI_DU_LIEU.BODY) { req.body = duLieu; }
    if (viTri === VI_TRI_DU_LIEU.PARAMS) { req.params = duLieu; }
}

function chuanHoaChiTietJoi(error, viTri) {
    if (!Array.isArray(error?.details)) { return null; }
    return error.details.map((item) => ({
        viTri,
        truong: Array.isArray(item.path) && item.path.length ? item.path.join('.') : null,
        loai: item.type || null,
        thongBao: item.message
    }));
}

async function validateDuLieu(schema, duLieu, viTri, options = {}) {
    const tuyChon = {
        ...TUY_CHON_MAC_DINH,
        ...options
    };
    try {
        return await schema.validateAsync(duLieu, tuyChon);
    } catch (error) {
        if (!error?.isJoi) { throw error; }
        throw loiYeuCau(
            'Dữ liệu gửi lên không hợp lệ.',
            MA_LOI.DU_LIEU_KHONG_HOP_LE,
            chuanHoaChiTietJoi(error, viTri)
        );
    }
}

function validate(schema, viTri = VI_TRI_DU_LIEU.BODY, options = {}) {
    kiemTraSchema(schema);
    kiemTraViTri(viTri);
    return async function validationMiddleware(req, res, next) {
        try {
            const duLieu = layDuLieu(req, viTri);
            const duLieuDaValidate = await validateDuLieu(schema, duLieu, viTri, options);
            ganDuLieuDaValidate(req, viTri, duLieuDaValidate);
            return next();
        } catch (error) {
            return next(error);
        }
    };
}

function validateBody(schema, options = {}) {
    return validate(schema, VI_TRI_DU_LIEU.BODY, options);
}

function validateParams(schema, options = {}) {
    return validate(schema, VI_TRI_DU_LIEU.PARAMS, options);
}

function validateQuery(schema, options = {}) {
    return validate(schema, VI_TRI_DU_LIEU.QUERY, options);
}

function validateRequest(schemas = {}, options = {}) {
    if (!schemas || typeof schemas !== 'object' || Array.isArray(schemas)) { throw new TypeError('Danh sách schema validation phải là một object.'); }
    const entries = Object.entries(schemas);
    if (!entries.length) { throw new TypeError('Phải cấu hình ít nhất một schema validation.'); }
    for (const [viTri, schema] of entries) {
        kiemTraViTri(viTri);
        kiemTraSchema(schema);
    }
    return async function validationRequestMiddleware(req, res, next) {
        try {
            for (const [viTri, schema] of entries) {
                const duLieu = layDuLieu(req, viTri);
                const duLieuDaValidate = await validateDuLieu(schema, duLieu, viTri, options);
                ganDuLieuDaValidate(req, viTri, duLieuDaValidate);
            }
            return next();
        } catch (error) {
            return next(error);
        }
    };
}

module.exports = {
    VI_TRI_DU_LIEU,
    validate,
    validateBody,
    validateParams,
    validateQuery,
    validateRequest
};