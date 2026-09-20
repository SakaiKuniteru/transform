'use strict';

const crypto = require('node:crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const { CORS_OPTIONS, COOKIE_CONFIG, HELMET_OPTIONS } = require('./config/security');
const routes = require('./routes');
const khongTimThay = require('./middlewares/khong-tim-thay');
const xuLyLoi = require('./middlewares/xu-ly-loi');
const app = express();
const { chuanHoaNgayGioJson } = require('./utils/ngay-gio');
const { rateLimitChung } = require('./middlewares/rate-limit');

app.disable('x-powered-by');
app.set('trust proxy', env.ungDung.trustProxy);
app.set('json escape', true);

function requestIdMiddleware(req, res, next) {
    const requestIdHeader = req.get('X-Request-Id');
    const requestId = requestIdHeader && /^[A-Za-z0-9._:-]{1,100}$/.test(requestIdHeader) ? requestIdHeader : crypto.randomUUID();
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    return next();
}

app.use(requestIdMiddleware);
app.use(helmet(HELMET_OPTIONS));
app.use(cors(CORS_OPTIONS));
app.use(rateLimitChung);
app.use(compression());
app.use(express.json({ limit: env.ungDung.jsonLimit }));
app.use(express.urlencoded({ extended: true, limit: env.ungDung.urlencodedLimit }));
app.use(cookieParser(COOKIE_CONFIG.secret));
app.use(env.ungDung.apiPrefix, routes);
app.use(khongTimThay);
app.use(xuLyLoi);

module.exports = app;