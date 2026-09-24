'use strict';
const session = require('express-session');
const Redis = require('ioredis');
let storeHienTai = null;

function tinhTtlGiay(sess, macDinh) {
    const maxAge = Number(sess?.cookie?.maxAge);
    if (Number.isFinite(maxAge) && maxAge > 0) { return Math.max(1, Math.ceil(maxAge / 1000)); }
    return macDinh;
}

function taoRedisClient(options = {}) {
    const redisOptions = {
        db: options.db || 0,
        connectTimeout: options.connectTimeoutMs || 10000,
        keepAlive: options.keepAliveMs || 10000,
        maxRetriesPerRequest: options.maxRetriesPerRequest ?? 1,
        lazyConnect: false
    };
    if (options.username) { redisOptions.username = options.username; }
    if (options.password) { redisOptions.password = options.password; }
    if (options.tls) { redisOptions.tls = {}; }
    if (options.url) { return new Redis(options.url, redisOptions); }
    return new Redis({ ...redisOptions, host: options.host || '127.0.0.1', port: options.port || 6379 });
}

class RedisSessionStore extends session.Store {
    constructor(options = {}) {
        super();
        this.prefix = String(options.prefix || 'transform:frontend:session:');
        this.ttlSeconds = Number(options.ttlSeconds || 604800);
        this.client = taoRedisClient(options);
        this.client.on('error', (error) => console.error('Redis session error:', error));
    }

    taoKey(sid) { return `${this.prefix}${sid}`; }

    get(sid, callback) {
        this.client.get(this.taoKey(sid)).then((value) => {
            if (!value) { callback(null, null); return; }
            try { callback(null, JSON.parse(value)); } catch (error) { callback(error); }
        }).catch(callback);
    }

    set(sid, sess, callback = () => {}) {
        const ttl = tinhTtlGiay(sess, this.ttlSeconds);
        this.client.set(this.taoKey(sid), JSON.stringify(sess), 'EX', ttl).then(() => callback(null)).catch(callback);
    }

    destroy(sid, callback = () => {}) { this.client.del(this.taoKey(sid)).then(() => callback(null)).catch(callback); }

    touch(sid, sess, callback = () => {}) {
        const ttl = tinhTtlGiay(sess, this.ttlSeconds);
        this.client.expire(this.taoKey(sid), ttl).then(() => callback(null)).catch(callback);
    }

    async close() {
        if (this.client.status === 'end') { return; }
        try { await this.client.quit(); } catch { this.client.disconnect(); }
    }
}

function taoRedisSessionStore(options = {}) {
    if (storeHienTai) { return storeHienTai; }
    storeHienTai = new RedisSessionStore(options);
    return storeHienTai;
}

async function dongRedisSessionStore() {
    if (!storeHienTai) { return; }
    const store = storeHienTai;
    storeHienTai = null;
    await store.close();
}

module.exports = {
    RedisSessionStore,
    taoRedisSessionStore,
    dongRedisSessionStore
};