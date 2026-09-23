'use strict';
const helmet = require('helmet');
const securityConfig = require('../config/security.config');
const helmetMiddleware = helmet(securityConfig.helmet);
const PERMISSIONS_POLICY = 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=()';

function securityMiddleware(req, res, next) {
    res.setHeader('Permissions-Policy', PERMISSIONS_POLICY);
    return helmetMiddleware(req, res, next);
}

module.exports = {
    securityMiddleware
};