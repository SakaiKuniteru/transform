'use strict';

const env = require('./env');

const REDIS_CONFIG = Object.freeze({
    url: env.redis.url,
    host: env.redis.host,
    port: env.redis.port,
    username: env.redis.username,
    password: env.redis.password,
    db: env.redis.db,
    tls: env.redis.tls,
    connectTimeout: env.redis.connectTimeoutMs,
    keepAlive: env.redis.keepAliveMs,
    maxRetriesPerRequest: env.redis.maxRetriesPerRequest
});

function taoRedisOptions({ worker = false } = {}) {
    const options = {
        db: REDIS_CONFIG.db,
        connectTimeout: REDIS_CONFIG.connectTimeout,
        keepAlive: REDIS_CONFIG.keepAlive,
        maxRetriesPerRequest: worker ? null : REDIS_CONFIG.maxRetriesPerRequest,
        enableReadyCheck: true,
        lazyConnect: true,

        retryStrategy(soLan) {
            return Math.min(soLan * 500, 5000);
        }
    };

    if (REDIS_CONFIG.tls) {
        options.tls = {};
    }

    if (!REDIS_CONFIG.url) {
        options.host = REDIS_CONFIG.host;
        options.port = REDIS_CONFIG.port;

        if (REDIS_CONFIG.username) {
            options.username = REDIS_CONFIG.username;
        }

        if (REDIS_CONFIG.password) {
            options.password = REDIS_CONFIG.password;
        }
    }

    return options;
}

function taoRedisClientConfig(options = {}) {
    return {
        url: REDIS_CONFIG.url,
        options: taoRedisOptions(options)
    };
}

function layThongTinKetNoiAnToan() {
    if (REDIS_CONFIG.url) {
        return {
            mode: 'url',
            db: REDIS_CONFIG.db,
            tls: REDIS_CONFIG.tls
        };
    }

    return {
        mode: 'host',
        host: REDIS_CONFIG.host,
        port: REDIS_CONFIG.port,
        db: REDIS_CONFIG.db,
        tls: REDIS_CONFIG.tls
    };
}

module.exports = {
    REDIS_CONFIG,
    taoRedisOptions,
    taoRedisClientConfig,
    layThongTinKetNoiAnToan
};