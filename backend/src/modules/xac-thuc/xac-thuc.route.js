'use strict';

const express = require('express');

const { validateBody } = require('../../middlewares/validate');
const { yeuCauXacThuc } = require('../../middlewares/xac-thuc');

const controller = require('./xac-thuc.controller');

const {
    dangKySchema,
    xacThucEmailSchema,
    guiLaiOtpSchema,
    dangNhapSchema,
    quenMatKhauSchema,
    xacThucOtpDatLaiMatKhauSchema,
    datLaiMatKhauSchema,
    doiMatKhauSchema
} = require('./xac-thuc.validation');


const router = express.Router();


/*
 * ============================================================
 * ĐĂNG KÝ
 * ============================================================
 */

router.post(
    '/dang-ky',
    validateBody(dangKySchema),
    controller.dangKy
);


router.post(
    '/xac-thuc-email',
    validateBody(xacThucEmailSchema),
    controller.xacThucEmail
);


router.post(
    '/gui-lai-otp',
    validateBody(guiLaiOtpSchema),
    controller.guiLaiOtp
);


/*
 * ============================================================
 * ĐĂNG NHẬP
 * ============================================================
 */

router.post(
    '/dang-nhap',
    validateBody(dangNhapSchema),
    controller.dangNhap
);


router.post(
    '/lam-moi-token',
    controller.lamMoiToken
);


router.post(
    '/dang-xuat',
    controller.dangXuat
);


router.post(
    '/dang-xuat-tat-ca',
    yeuCauXacThuc,
    controller.dangXuatTatCa
);


/*
 * ============================================================
 * MẬT KHẨU
 * ============================================================
 */

router.post(
    '/quen-mat-khau',
    validateBody(quenMatKhauSchema),
    controller.quenMatKhau
);


router.post(
    '/xac-thuc-otp-dat-lai-mat-khau',
    validateBody(xacThucOtpDatLaiMatKhauSchema),
    controller.xacThucOtpDatLaiMatKhau
);


router.post(
    '/dat-lai-mat-khau',
    validateBody(datLaiMatKhauSchema),
    controller.datLaiMatKhau
);


router.post(
    '/doi-mat-khau',
    yeuCauXacThuc,
    validateBody(doiMatKhauSchema),
    controller.doiMatKhau
);


module.exports = router;