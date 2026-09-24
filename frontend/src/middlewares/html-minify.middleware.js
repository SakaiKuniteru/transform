'use strict';
const appConfig = require('../config/app.config');

function nenHtml(html) {
    if (typeof html !== 'string') { return html; }
    return html.replace(/<!--[\s\S]*?-->/g, '').replace(/>\s+</g, '><').replace(/\r?\n/g, '').trim();
}

function htmlMinifyMiddleware(req, res, next) {
    if (!appConfig.htmlMinify) { return next(); }
    const send = res.send.bind(res);
    res.send = function sendNen(body) {
        if (typeof body === 'string' && /<!doctype\s+html|<html\b/i.test(body.slice(0, 256))) { body = nenHtml(body); }
        return send(body);
    };
    return next();
}

module.exports = {
    nenHtml,
    htmlMinifyMiddleware
};