'use strict';

const express = require('express');
const controller = require('./goi-dich-vu.controller');

const router = express.Router();

router.get('/', controller.index);
router.post('/:id/huy', controller.huyPost);

module.exports = {
    router
};