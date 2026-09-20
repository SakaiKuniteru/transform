'use strict';

const express = require('express');
const controller = require('./cong-viec.controller');
const {
    paramsIdSchema,
    danhSachSchema
} = require('./cong-viec.validation');
const {
    validateParams,
    validateQuery
} = require('../../middlewares/validate');
const { xacThucTuyChon } = require('../../middlewares/xac-thuc');
const { damBaoPhienKhach } = require('../../middlewares/phien-khach');

const router = express.Router();

router.use(
    xacThucTuyChon,
    damBaoPhienKhach
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