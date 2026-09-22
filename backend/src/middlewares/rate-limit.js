'use strict';

const crypto = require('node:crypto');
const env = require('../config/env');
const MA_LOI = require('../constants/ma-loi');
const { layRedisClient } = require('../config/redis');
const {
    loiQuaNhieuYeuCau,
    loiDichVuKhongKhaDung
} = require('../utils/loi');

const LUA_TANG_RATE_LIMIT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
    redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return {current, ttl}
`;

function bamGiaTri(value) {
    return crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 32);
}

function layIp(req) {
    return req.ip || req.socket?.remoteAddress || 'unknown';
}

function laHealthCheck(req) {
    const path = req.path || '';
    return path === `${env.ungDung.apiPrefix}/health` || path === `${env.ungDung.apiPrefix}/health/ready`;
}

function taoRateLimit({ ten, windowMs, max, skip = null }) {
    if (!ten || !Number.isSafeInteger(windowMs) || windowMs <= 0 || !Number.isSafeInteger(max) || max <= 0) { throw new TypeError('Cấu hình rate limit không hợp lệ.'); }
    return async function rateLimitMiddleware(req, res, next) {
        if (req.method === 'OPTIONS' || skip?.(req) === true) { return next(); }
        const key = `rate-limit:${ten}:${bamGiaTri(layIp(req))}`;
        try {
            const client = layRedisClient();
            const [currentRaw, ttlRaw] = await client.eval(LUA_TANG_RATE_LIMIT, 1, key, String(windowMs));
            const current = Number(currentRaw);
            const ttl = Math.max(0, Number(ttlRaw));
            const remaining = Math.max(0, max - current);
            const resetSeconds = Math.max(1, Math.ceil(ttl / 1000));
            res.setHeader('RateLimit-Limit', String(max));
            res.setHeader('RateLimit-Remaining', String(remaining));
            res.setHeader('RateLimit-Reset', String(resetSeconds));
            if (current <= max) { return next(); }
            res.setHeader('Retry-After', String(resetSeconds));
            return next(loiQuaNhieuYeuCau('Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.', MA_LOI.QUA_NHIEU_YEU_CAU, {
                gioiHan: max,
                cuaSoMs: windowMs,
                thuLaiSauGiay: resetSeconds
            }));
        } catch (error) {
            if (error?.statusCode === 429 || error?.name === 'LoiUngDung') { return next(error); }
            return next(loiDichVuKhongKhaDung('Không thể kiểm tra giới hạn truy cập vì Redis không khả dụng.', MA_LOI.REDIS_KHONG_KHA_DUNG, error));
        }
    };
}

const rateLimitChung = taoRateLimit({
    ten: 'chung',
    windowMs: env.baoMat.rateLimitWindowMs,
    max: env.baoMat.rateLimitMax,
    skip: laHealthCheck
});

const rateLimitXacThuc = taoRateLimit({
    ten: 'xac-thuc',
    windowMs: env.baoMat.authRateLimitWindowMs,
    max: env.baoMat.authRateLimitMax
});

module.exports = {
    taoRateLimit,
    rateLimitChung,
    rateLimitXacThuc
};