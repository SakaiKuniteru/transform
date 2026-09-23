'use strict';

const express = require('express');
const controller = require('./chinh-sach-han-muc.controller');

const router = express.Router();

router.get('/', controller.index);
router.post('/tao', controller.taoPost);
router.post('/:id/cap-nhat', controller.capNhatPost);
router.post('/:id/trang-thai', controller.trangThaiPost);
router.post('/:id/xoa', controller.xoaPost);

module.exports = {
    router
};