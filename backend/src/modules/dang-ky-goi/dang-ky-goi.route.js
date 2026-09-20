'use strict';

const express = require('express');

const controller = require('./dang-ky-goi.controller');

const {
    paramsIdSchema,
    dangKySchema,
    ganGoiSchema,
    kichHoatSchema,
    huySchema,
    danhSachSchema,
    danhSachCuaToiSchema
} = require('./dang-ky-goi.validation');

const {
    validateBody,
    validateParams,
    validateQuery
} = require('../../middlewares/validate');

const { yeuCauXacThuc } = require('../../middlewares/xac-thuc');
const { yeuCauQuanTri } = require('../../middlewares/phan-quyen');

const router = express.Router();

router.use(yeuCauXacThuc);

router.get(
    '/cua-toi',
    validateQuery(danhSachCuaToiSchema),
    controller.getCuaToi
);

router.get(
    '/hien-tai',
    controller.getHienTai
);

router.post(
    '/',
    validateBody(dangKySchema),
    controller.dangKy
);

router.patch(
    '/cua-toi/:id/huy',
    validateParams(paramsIdSchema),
    validateBody(huySchema),
    controller.huyCuaToi
);

router.get(
    '/',
    yeuCauQuanTri,
    validateQuery(danhSachSchema),
    controller.getDanhSach
);

router.get(
    '/:id',
    yeuCauQuanTri,
    validateParams(paramsIdSchema),
    controller.getChiTiet
);

router.post(
    '/gan-goi',
    yeuCauQuanTri,
    validateBody(ganGoiSchema),
    controller.ganGoi
);

router.patch(
    '/:id/kich-hoat',
    yeuCauQuanTri,
    validateParams(paramsIdSchema),
    validateBody(kichHoatSchema),
    controller.kichHoat
);

router.patch(
    '/:id/tam-dung',
    yeuCauQuanTri,
    validateParams(paramsIdSchema),
    controller.tamDung
);

router.patch(
    '/:id/tiep-tuc',
    yeuCauQuanTri,
    validateParams(paramsIdSchema),
    controller.tiepTuc
);

router.patch(
    '/:id/huy',
    yeuCauQuanTri,
    validateParams(paramsIdSchema),
    validateBody(huySchema),
    controller.huyQuanTri
);

module.exports = router;