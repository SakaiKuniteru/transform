'use strict';
const env = require('./env');
module.exports = Object.freeze({
    baseURL: env.apiBaseUrl,
    timeout: env.apiTimeoutMs,
    withCredentials: true,
    headers: Object.freeze({
        Accept: 'application/json',
        'Content-Type': 'application/json'
    })
});