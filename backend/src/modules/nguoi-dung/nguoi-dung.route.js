'use strict';

const express = require('express');

const { yeuCauXacThuc } = require('../../middlewares/xac-thuc');
const { yeuCauQuanTri } = require('../../middlewares/phan-quyen');
const {
    validateBody,
    validateParams,
    validateQuery
} = require('../../middlewares/validate');

const controller = require('./nguoi-dung.controller');
const {
    idParamsSchema,
    danhSachQuerySchema,
    taoMoiSchema,
    capNhatSchema,
    capNhatHienTaiSchema,
    capNhatTrangThaiSchema
} = require('./nguoi-dung.validation');


const router = express.Router();


router.get(
    '/hien-tai',
    yeuCauXacThuc,
    controller.layHienTai
);

router.patch(
    '/hien-tai',
    yeuCauXacThuc,
    validateBody(capNhatHienTaiSchema),
    controller.capNhatHienTai
);

router.get(
    '/',
    yeuCauXacThuc,
    yeuCauQuanTri,
    validateQuery(danhSachQuerySchema),
    controller.layDanhSach
);

router.post(
    '/',
    yeuCauXacThuc,
    yeuCauQuanTri,
    validateBody(taoMoiSchema),
    controller.taoMoi
);

router.get(
    '/:id',
    yeuCauXacThuc,
    yeuCauQuanTri,
    validateParams(idParamsSchema),
    controller.layChiTiet
);

router.patch(
    '/:id',
    yeuCauXacThuc,
    yeuCauQuanTri,
    validateParams(idParamsSchema),
    validateBody(capNhatSchema),
    controller.capNhat
);

router.patch(
    '/:id/trang-thai',
    yeuCauXacThuc,
    yeuCauQuanTri,
    validateParams(idParamsSchema),
    validateBody(capNhatTrangThaiSchema),
    controller.capNhatTrangThai
);

router.delete(
    '/:id',
    yeuCauXacThuc,
    yeuCauQuanTri,
    validateParams(idParamsSchema),
    controller.xoa
);


module.exports = router;