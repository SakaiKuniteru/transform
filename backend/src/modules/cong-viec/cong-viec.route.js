'use strict';

const express = require('express');
const controller = require('./cong-viec.controller');
const {
    paramsIdSchema,
    danhSachSchema,
    danhSachQuanTriSchema
} = require('./cong-viec.validation');
const {
    validateParams,
    validateQuery
} = require('../../middlewares/validate');
const { yeuCauXacThuc, xacThucTuyChon } = require('../../middlewares/xac-thuc');
const { yeuCauQuanTri } = require('../../middlewares/phan-quyen');
const { damBaoPhienKhach } = require('../../middlewares/phien-khach');

const router = express.Router();

router.use(
    xacThucTuyChon,
    damBaoPhienKhach
);

router.get(
    '/',
    yeuCauXacThuc,
    yeuCauQuanTri,
    validateQuery(danhSachQuanTriSchema),
    controller.getDanhSachQuanTri
);

router.get(
    '/cua-toi',
    validateQuery(danhSachSchema),
    controller.getCuaToi
);

router.get(
    '/:id',
    validateParams(paramsIdSchema),
    controller.getChiTiet
);

router.patch(
    '/:id/huy',
    validateParams(paramsIdSchema),
    controller.huy
);

module.exports = router;