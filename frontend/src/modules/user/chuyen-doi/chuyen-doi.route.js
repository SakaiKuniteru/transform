'use strict';
const express = require('express');
const controller = require('./chuyen-doi.controller');
const router = express.Router();

router.get('/', controller.index);
router.get('/ho-tro', controller.hoTro);
router.post('/', controller.taoPost);
router.get('/:id', controller.chiTiet);

module.exports = {
    router
};