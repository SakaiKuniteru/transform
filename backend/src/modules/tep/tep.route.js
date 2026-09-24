'use strict';

const express = require('express');
const controller = require('./tep.controller');
const {
    paramsIdSchema,
    danhSachSchema,
    danhSachQuanTriSchema,
    capNhatSchema
} = require('./tep.validation');
const {
    validateBody,
    validateParams,
    validateQuery
} = require('../../middlewares/validate');
const { yeuCauXacThuc, xacThucTuyChon } = require('../../middlewares/xac-thuc');
const { yeuCauQuanTri } = require('../../middlewares/phan-quyen');
const { damBaoPhienKhach } = require('../../middlewares/phien-khach');
const { chinhSachUpload } = require('../../middlewares/chinh-sach-upload');
const { kiemTraHanMucUpload } = require('../../middlewares/kiem-tra-han-muc-upload');
const { uploadNhieuTep } = require('../../middlewares/upload');

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