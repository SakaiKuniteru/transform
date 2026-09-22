'use strict';

const express = require('express');

const controller = require('./chinh-sach-han-muc.controller');

const {
    taoMoiSchema,
    capNhatSchema,
    capNhatTrangThaiSchema,
    paramsIdSchema,
    danhSachSchema
} = require('./chinh-sach-han-muc.validation');

const {
    validateBody,
    validateParams,
    validateQuery
} = require('../../middlewares/validate');

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
    '/:id',
    validateParams(paramsIdSchema),
    controller.getChiTiet
);

router.post(
    '/',
    validateBody(taoMoiSchema),
    controller.create
);

router.patch(
    '/:id',
    validateParams(paramsIdSchema),
    validateBody(capNhatSchema),
    controller.update
);

router.patch(
    '/:id/trang-thai',
    validateParams(paramsIdSchema),
    validateBody(capNhatTrangThaiSchema),
    controller.updateTrangThai
);

router.delete(
    '/:id',
    validateParams(paramsIdSchema),
    controller.xoa
);

module.exports = router;