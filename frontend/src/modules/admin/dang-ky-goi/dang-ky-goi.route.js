'use strict';

const express = require('express');
const controller = require('./dang-ky-goi.controller');

const router = express.Router();

router.get('/', controller.index);
router.post('/gan-goi', controller.ganGoiPost);
router.post('/:id/kich-hoat', controller.kichHoatPost);
router.post('/:id/tam-dung', controller.tamDungPost);
router.post('/:id/tiep-tuc', controller.tiepTucPost);
router.post('/:id/huy', controller.huyPost);
router.get('/:id', controller.chiTiet);

module.exports = {
    router
};