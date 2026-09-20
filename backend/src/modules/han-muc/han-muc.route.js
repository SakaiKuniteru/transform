'use strict';

const express = require('express');

const controller = require('./han-muc.controller');

const {
    paramsMaHanhDongSchema,
    paramsNguoiDungIdSchema,
    paramsNguoiDungMaHanhDongSchema
} = require('./han-muc.validation');

const {
    validateParams
} = require('../../middlewares/validate');

const { yeuCauXacThuc } = require('../../middlewares/xac-thuc');
const { yeuCauQuanTri } = require('../../middlewares/phan-quyen');

const router = express.Router();

router.use(yeuCauXacThuc);

router.get(
    '/cua-toi',
    controller.getCuaToi
);

router.get(
    '/cua-toi/:maHanhDong',
    validateParams(paramsMaHanhDongSchema),
    controller.getChiTietCuaToi
);

router.get(
    '/nguoi-dung/:nguoiDungId',
    yeuCauQuanTri,
    validateParams(paramsNguoiDungIdSchema),
    controller.getNguoiDung
);

router.get(
    '/nguoi-dung/:nguoiDungId/:maHanhDong',
    yeuCauQuanTri,
    validateParams(paramsNguoiDungMaHanhDongSchema),
    controller.getChiTietNguoiDung
);

module.exports = router;