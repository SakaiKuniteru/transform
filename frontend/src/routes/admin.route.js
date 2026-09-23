'use strict';

const express = require('express');
const { yeuCauDangNhap } = require('../middlewares/auth.middleware');
const { adminMiddleware } = require('../middlewares/admin.middleware');
const { router: dashboardRouter } = require('../modules/admin/dashboard/dashboard.route');
const { router: nguoiDungRouter } = require('../modules/admin/nguoi-dung/nguoi-dung.route');
const { router: tepRouter } = require('../modules/admin/tep/tep.route');
const { router: congViecRouter } = require('../modules/admin/cong-viec/cong-viec.route');
const { router: goiDichVuRouter } = require('../modules/admin/goi-dich-vu/goi-dich-vu.route');
const { router: dangKyGoiRouter } = require('../modules/admin/dang-ky-goi/dang-ky-goi.route');
const { router: chinhSachHanMucRouter } = require('../modules/admin/chinh-sach-han-muc/chinh-sach-han-muc.route');

const router = express.Router();

router.use(yeuCauDangNhap);
router.use(adminMiddleware);
router.use('/', dashboardRouter);
router.use('/nguoi-dung', nguoiDungRouter);
router.use('/tep', tepRouter);
router.use('/cong-viec', congViecRouter);
router.use('/goi-dich-vu', goiDichVuRouter);
router.use('/dang-ky-goi', dangKyGoiRouter);
router.use('/chinh-sach-han-muc', chinhSachHanMucRouter);

module.exports = {
    router
};