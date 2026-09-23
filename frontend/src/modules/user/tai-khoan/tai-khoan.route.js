'use strict';

const express = require('express');
const controller = require('./tai-khoan.controller');

const router = express.Router();

router.get('/', controller.index);
router.post('/cap-nhat', controller.capNhatPost);
router.post('/doi-mat-khau', controller.doiMatKhauPost);

module.exports = {
    router
};