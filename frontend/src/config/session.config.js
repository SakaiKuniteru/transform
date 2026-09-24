'use strict';
const env = require('./env');
const { taoRedisSessionStore } = require('../core/session/redis-session.store');
const config = {
    name: env.sessionName,
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: Object.freeze({
        httpOnly: true,
        secure: env.sessionSecure,
        sameSite: env.sessionSameSite,
        maxAge: env.sessionMaxAgeMs,
        path: '/'
    })
};

if (env.isProduction) {
    config.store = taoRedisSessionStore({
        url: env.redisUrl || null,
        host: env.redisHost,
        port: env.redisPort,
        username: env.redisUsername || null,
        password: env.redisPassword || null,
        db: env.redisDb,
        tls: env.redisTls,
        connectTimeoutMs: env.redisConnectTimeoutMs,
        keepAliveMs: env.redisKeepAliveMs,
        maxRetriesPerRequest: env.redisMaxRetriesPerRequest,
        prefix: env.sessionRedisPrefix,
        ttlSeconds: env.sessionRedisTtlSeconds
    });
}

module.exports = Object.freeze(config);