'use strict';
const express = require('express');
const controller = require('../modules/public/cong-cu/cong-cu.controller');
const router = express.Router();
router.get('/', controller.index);
router.get('/cong-cu', controller.index);
router.get('/cong-cu/kha-dung', controller.khaDung);
router.get('/cong-cu/xac-nhan', controller.xacNhan);
router.post('/cong-cu/upload', controller.upload);
router.post('/cong-cu/tao', controller.tao);
router.get('/cong-cu/cong-viec/:id/trang-thai', controller.trangThai);
router.get('/cong-cu/cong-viec/:id', controller.chiTiet);
router.get('/cong-cu/tep/:id/tai-xuong', controller.taiXuong);
router.get('/cong-cu/:slug', controller.congCu);
module.exports = {
    router
};
