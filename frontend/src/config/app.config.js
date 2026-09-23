'use strict';
const env = require('./env');
module.exports = Object.freeze({
    name: env.appName,
    version: env.appVersion,
    environment: env.nodeEnv,
    host: env.host,
    port: env.port,
    publicBaseUrl: env.publicBaseUrl,
    trustProxy: env.trustProxy,
    jsonLimit: env.jsonLimit,
    urlencodedLimit: env.urlencodedLimit,
    requestTimeoutMs: env.requestTimeoutMs,
    shutdownTimeoutMs: env.shutdownTimeoutMs
});