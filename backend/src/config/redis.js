'use strict';

const Redis = require('ioredis');
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

let redisClient = null;

function taoRedisOptions({ worker = false, lazyConnect = true } = {}) {
    const options = {
        db: REDIS_CONFIG.db,
        connectTimeout: REDIS_CONFIG.connectTimeout,
        keepAlive: REDIS_CONFIG.keepAlive,
        maxRetriesPerRequest: worker ? null : REDIS_CONFIG.maxRetriesPerRequest,
        enableReadyCheck: true,
        lazyConnect,
        retryStrategy(soLan) {
            return Math.min(soLan * 500, 5000);
        }
    };
    if (REDIS_CONFIG.tls) { options.tls = {}; }
    if (!REDIS_CONFIG.url) {
        options.host = REDIS_CONFIG.host;
        options.port = REDIS_CONFIG.port;
        if (REDIS_CONFIG.username) { options.username = REDIS_CONFIG.username; }
        if (REDIS_CONFIG.password) { options.password = REDIS_CONFIG.password; }
    }
    return options;
}

function taoRedisClient(options = {}) {
    const redisOptions = taoRedisOptions(options);
    return REDIS_CONFIG.url ? new Redis(REDIS_CONFIG.url, redisOptions) : new Redis(redisOptions);
}

function layRedisClient() {
    if (!redisClient || redisClient.status === 'end') { redisClient = taoRedisClient(); }
    return redisClient;
}

async function ketNoiRedis() {
    const client = layRedisClient();
    if (client.status === 'wait') { await client.connect(); }
    const pong = await client.ping();
    return {
        connected: pong === 'PONG',
        status: client.status,
        db: REDIS_CONFIG.db
    };
}

async function kiemTraRedis() {
    const client = layRedisClient();
    const batDau = process.hrtime.bigint();
    if (client.status === 'wait') { await client.connect(); }
    const pong = await client.ping();
    const ketThuc = process.hrtime.bigint();
    return {
        connected: pong === 'PONG',
        status: client.status,
        db: REDIS_CONFIG.db,
        durationMs: Number(ketThuc - batDau) / 1_000_000
    };
}

async function dongRedis() {
    if (!redisClient) { return; }
    const client = redisClient;
    redisClient = null;
    if (client.status === 'wait' || client.status === 'end') {
        client.disconnect();
        return;
    }
    try {
        await client.quit();
    } catch {
        client.disconnect();
    }
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
    taoRedisClient,
    layRedisClient,
    ketNoiRedis,
    kiemTraRedis,
    dongRedis,
    layThongTinKetNoiAnToan
};