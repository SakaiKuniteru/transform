'use strict';

const express = require('express');

const { router: authModuleRouter } = require('../modules/auth/auth.route');

const router = express.Router();

router.use('/', authModuleRouter);

module.exports = {
    router
};