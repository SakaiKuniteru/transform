'use strict';
const express = require('express');
const controller = require('./auth.controller');
const { guestMiddleware } = require('../../middlewares/guest.middleware');
const { yeuCauDangNhap } = require('../../middlewares/auth.middleware');
const router = express.Router();

router.get('/dang-nhap', guestMiddleware, controller.dangNhapPage);
router.post('/dang-nhap', guestMiddleware, controller.dangNhapPost);
router.get('/dang-ky', guestMiddleware, controller.dangKyPage);
router.post('/dang-ky', guestMiddleware, controller.dangKyPost);
router.get('/xac-thuc-email', guestMiddleware, controller.xacThucEmailPage);
router.post('/xac-thuc-email', guestMiddleware, controller.xacThucEmailPost);
router.post('/gui-lai-otp', guestMiddleware, controller.guiLaiOtpPost);
router.get('/quen-mat-khau', guestMiddleware, controller.quenMatKhauPage);
router.post('/quen-mat-khau', guestMiddleware, controller.quenMatKhauPost);
router.get('/dat-lai-mat-khau', guestMiddleware, controller.datLaiMatKhauPage);
router.post('/dat-lai-mat-khau', guestMiddleware, controller.datLaiMatKhauPost);
router.post('/doi-mat-khau', yeuCauDangNhap, controller.doiMatKhauPost);
router.post('/dang-xuat', controller.dangXuatPost);
router.post('/dang-xuat-tat-ca', yeuCauDangNhap, controller.dangXuatTatCaPost);

module.exports = router;