'use strict';

const express = require('express');
const controller = require('./nguoi-dung.controller');

const router = express.Router();

router.get('/', controller.index);
router.post('/tao', controller.taoPost);
router.post('/:id/cap-nhat', controller.capNhatPost);
router.post('/:id/trang-thai', controller.trangThaiPost);
router.post('/:id/xoa', controller.xoaPost);
router.get('/:id', controller.chiTiet);

module.exports = {
    router
};