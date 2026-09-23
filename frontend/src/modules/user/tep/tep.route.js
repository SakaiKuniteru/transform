'use strict';
const express = require('express');
const controller = require('./tep.controller');
const router = express.Router();

router.get('/', controller.index);
router.post('/upload', controller.uploadPost);
router.get('/:id/tai-xuong', controller.taiXuong);
router.post('/:id/cap-nhat', controller.capNhatPost);
router.post('/:id/xoa', controller.xoaPost);
router.get('/:id', controller.chiTiet);

module.exports = {
    router
};