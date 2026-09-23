'use strict';

const express = require('express');
const controller = require('./cong-viec.controller');

const router = express.Router();

router.get('/', controller.index);
router.post('/:id/huy', controller.huyPost);
router.get('/:id', controller.chiTiet);

module.exports = {
    router
};