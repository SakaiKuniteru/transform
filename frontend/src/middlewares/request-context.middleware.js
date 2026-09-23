'use strict';
const crypto = require('node:crypto');
const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function chuanHoaRequestId(value) {
    if (typeof value !== 'string') { return null; }
    const requestId = value.trim();
    return REQUEST_ID_PATTERN.test(requestId) ? requestId : null;
}

function taoRequestId(req) { return chuanHoaRequestId(req.get('x-request-id')) || crypto.randomUUID(); }

function requestContextMiddleware(req, res, next) {
    const requestId = taoRequestId(req);
    req.requestId = requestId;
    req.id = requestId;
    req.requestContext = Object.freeze({ requestId, method: req.method, path: req.originalUrl || req.url || '/', startedAt: Date.now() });
    res.locals.requestId = requestId;
    res.locals.currentPath = req.path;
    res.setHeader('X-Request-Id', requestId);
    return next();
}

module.exports = {
    requestContextMiddleware,
    chuanHoaRequestId,
    taoRequestId
};