'use strict';
const crypto = require('node:crypto');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const { engine } = require('express-handlebars');
const appConfig = require('./config/app.config');
const sessionConfig = require('./config/session.config');
const securityConfig = require('./config/security.config');
const viewConfig = require('./config/view.config');
const assetConfig = require('./config/asset.config');
const app = express();
const ERROR_VIEWS = new Set([ 400, 401, 403, 404, 429, 500, 503 ]);

function taoCsrfToken() {
    return crypto.randomBytes(securityConfig.csrf.tokenBytes).toString('hex');
}

function soSanhCsrfToken(tokenA, tokenB) {
    if (typeof tokenA !== 'string' || typeof tokenB !== 'string') { return false; }
    const bufferA = Buffer.from(tokenA);
    const bufferB = Buffer.from(tokenB);
    if (bufferA.length !== bufferB.length) { return false; }
    return crypto.timingSafeEqual(bufferA, bufferB);
}

function csrfMiddleware(req, res, next) {
    if (!securityConfig.csrf.enabled) { return next(); }
    if (!req.session.csrfToken) { req.session.csrfToken = taoCsrfToken(); }
    res.locals.csrfToken = req.session.csrfToken;
    if (securityConfig.csrf.safeMethods.includes(req.method)) { return next(); }
    const token = req.get(securityConfig.csrf.headerName) || req.body?.[securityConfig.csrf.fieldName];
    if (!soSanhCsrfToken(token, req.session.csrfToken)) { const error = new Error('CSRF token không hợp lệ.'); error.statusCode = 403; return next(error); }
    return next();
}

function notFoundMiddleware(req, res, next) {
    const error = new Error('Không tìm thấy tài nguyên.');
    error.statusCode = 404;
    return next(error);
}

function errorMiddleware(error, req, res, next) {
    if (res.headersSent) { return next(error); }
    const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
    const viewStatus = ERROR_VIEWS.has(statusCode) ? statusCode : 500;
    if (statusCode >= 500) { console.error(error); }
    return res.status(statusCode).render(`pages/errors/${viewStatus}`, { layout: 'error', title: statusCode === 404 ? 'Không tìm thấy trang | Transform' : 'Đã xảy ra lỗi | Transform', statusCode, message: appConfig.environment === 'production' && statusCode >= 500 ? 'Đã xảy ra lỗi hệ thống.' : error.message });
}

if (appConfig.trustProxy !== false) { app.set('trust proxy', appConfig.trustProxy); }
app.disable('x-powered-by');
app.engine(viewConfig.engineName, engine({ extname: viewConfig.extname, defaultLayout: viewConfig.defaultLayout, layoutsDir: viewConfig.layoutsDir, partialsDir: viewConfig.partialsDir }));
app.set('view engine', viewConfig.engineName);
app.set('views', viewConfig.viewsDir);
app.use(helmet(securityConfig.helmet));
app.use(compression());
app.use(cookieParser());
app.use(session(sessionConfig));
app.use(express.json({ limit: appConfig.jsonLimit }));
app.use(express.urlencoded({ extended: true, limit: appConfig.urlencodedLimit }));
app.use(csrfMiddleware);
app.use(assetConfig.urlPrefix, express.static(assetConfig.rootDir, { maxAge: assetConfig.maxAge, immutable: assetConfig.immutable, index: assetConfig.index, fallthrough: assetConfig.fallthrough }));
app.use((req, res, next) => { res.locals.appName = appConfig.name; res.locals.appVersion = appConfig.version; res.locals.currentPath = req.path; return next(); });
app.get('/', (req, res) => res.render('pages/trang-chu', { title: 'Transform Platform' }));
app.use(notFoundMiddleware);
app.use(errorMiddleware);
module.exports = app;