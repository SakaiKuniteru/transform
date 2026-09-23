'use strict';

const express = require('express');

const controller = require('./su-dung-han-muc.controller');

const router = express.Router();

router.get('/', controller.index);

module.exports = {
    router
};