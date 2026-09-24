'use strict';
const express = require('express');
const controller = require('./nhat-ky.controller');
const {
    danhSachSchema,
    requestParamsSchema,
    traceParamsSchema,
    congViecParamsSchema
} = require('./nhat-ky.validation');
const { validateParams, validateQuery } = require('../../middlewares/validate');
const { yeuCauXacThuc } = require('../../middlewares/xac-thuc');
const { yeuCauQuanTri } = require('../../middlewares/phan-quyen');
const router = express.Router();

router.use(
    yeuCauXacThuc,
    yeuCauQuanTri
);

router.get(
    '/',
    validateQuery(danhSachSchema),
    controller.getDanhSach
);

router.get(
    '/request/:requestId',
    validateParams(requestParamsSchema),
    controller.getTheoRequestId
);

router.get(
    '/trace/:traceId',
    validateParams(traceParamsSchema),
    controller.getTheoTraceId
);

router.get(
    '/cong-viec/:congViecId',
    validateParams(congViecParamsSchema),
    controller.getTheoCongViec
);

module.exports = router;