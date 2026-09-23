'use strict';

const express = require('express');

const { taoViewContext } = require('../core/views/view-context');

const router = express.Router();

router.get('/', (req, res) => {
    const data = taoViewContext(req, res, {
        page: {
            title: 'Transform Platform',
            description: 'Nền tảng chuyển đổi và xử lý tệp Transform.'
        }
    });
    return res.render('pages/trang-chu', data);
});

module.exports = {
    router
};