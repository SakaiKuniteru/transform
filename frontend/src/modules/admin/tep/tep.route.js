'use strict';
const express = require('express');
const controller = require('./tep.controller');
const router = express.Router();

router.get('/', controller.index);
router.post('/:id/xoa', controller.xoaPost);

module.exports = {
    router
};