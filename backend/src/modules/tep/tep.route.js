'use strict';

const express = require('express');
const controller = require('./tep.controller');
const {
    paramsIdSchema,
    danhSachSchema,
    capNhatSchema
} = require('./tep.validation');
const {
    validateBody,
    validateParams,
    validateQuery
} = require('../../middlewares/validate');
const { yeuCauXacThuc } = require('../../middlewares/xac-thuc');
const { chinhSachUpload } = require('../../middlewares/chinh-sach-upload');
const { kiemTraHanMucUpload } = require('../../middlewares/kiem-tra-han-muc-upload');
const { uploadNhieuTep } = require('../../middlewares/upload');

const router = express.Router();

router.use(yeuCauXacThuc);

router.post(
    '/upload',
    chinhSachUpload,
    uploadNhieuTep('teps'),
    kiemTraHanMucUpload,
    controller.upload
);

router.get(
    '/cua-toi',
    validateQuery(danhSachSchema),
    controller.getDanhSach
);

router.get(
    '/:id/tai-xuong',
    validateParams(paramsIdSchema),
    controller.taiXuong
);

router.get(
    '/:id',
    validateParams(paramsIdSchema),
    controller.getChiTiet
);

router.patch(
    '/:id',
    validateParams(paramsIdSchema),
    validateBody(capNhatSchema),
    controller.capNhat
);

router.delete(
    '/:id',
    validateParams(paramsIdSchema),
    controller.xoa
);

module.exports = router;