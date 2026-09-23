'use strict';
const express = require('express');
const { yeuCauDangNhap } = require('../middlewares/auth.middleware');
const { userMiddleware } = require('../middlewares/user.middleware');
const { router: dashboardRouter } = require('../modules/user/dashboard/dashboard.route');
const { router: tepRouter } = require('../modules/user/tep/tep.route');
const { router: chuyenDoiRouter } = require('../modules/user/chuyen-doi/chuyen-doi.route');
const { router: congViecRouter } = require('../modules/user/cong-viec/cong-viec.route');
const { router: lichSuRouter } = require('../modules/user/lich-su/lich-su.route');
const router = express.Router();

router.use(yeuCauDangNhap);
router.use(userMiddleware);
router.use('/', dashboardRouter);
router.use('/tep', tepRouter);
router.use('/chuyen-doi', chuyenDoiRouter);
router.use('/cong-viec', congViecRouter);
router.use('/lich-su', lichSuRouter);

module.exports = {
    router
};