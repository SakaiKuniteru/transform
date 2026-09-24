'use strict';
const path = require('node:path');
const dotenv = require('dotenv');
const FRONTEND_ROOT = path.resolve(__dirname, '../..');
const ENV_FILE = process.env.ENV_FILE ? path.resolve(process.env.ENV_FILE) : path.join(FRONTEND_ROOT, '.env');
dotenv.config({ path: ENV_FILE, quiet: true });
const NODE_ENV = process.env.NODE_ENV || 'development';

function layChuoi(ten, macDinh = '') {
    const giaTri = process.env[ten];
    return giaTri === undefined || giaTri === null || giaTri === '' ? macDinh : String(giaTri).trim();
}

function laySoNguyen(ten, macDinh, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
    const giaTri = process.env[ten];
    if (giaTri === undefined || giaTri === null || giaTri === '') { return macDinh; }
    const so = Number(giaTri);
    if (!Number.isSafeInteger(so) || so < min || so > max) { throw new TypeError(`${ten} phải là số nguyên từ ${min} đến ${max}.`); }
    return so;
}

function layBoolean(ten, macDinh = false) {
    const giaTri = process.env[ten];
    if (giaTri === undefined || giaTri === null || giaTri === '') { return macDinh; }
    if (String(giaTri).toLowerCase() === 'true') { return true; }
    if (String(giaTri).toLowerCase() === 'false') { return false; }
    throw new TypeError(`${ten} phải bằng true hoặc false.`);
}

function laySameSite() {
    const giaTri = layChuoi('SESSION_SAME_SITE', 'lax').toLowerCase();
    if (![ 'lax', 'strict', 'none' ].includes(giaTri)) { throw new TypeError('SESSION_SAME_SITE phải là lax, strict hoặc none.'); }
    return giaTri;
}

function layTrustProxy() {
    const giaTri = layChuoi('TRUST_PROXY', 'false');
    if (giaTri === 'true') { return true; }
    if (giaTri === 'false') { return false; }
    if (/^\d+$/.test(giaTri)) { return Number(giaTri); }
    return giaTri;
}

if (![ 'development', 'test', 'production' ].includes(NODE_ENV)) { throw new TypeError('NODE_ENV không hợp lệ.'); }
const isProduction = NODE_ENV === 'production';
const sessionSecret = layChuoi('SESSION_SECRET', isProduction ? '' : 'transform-development-session-secret-change-me');
if (isProduction && sessionSecret.length < 32) { throw new Error('SESSION_SECRET production phải có ít nhất 32 ký tự.'); }
module.exports = Object.freeze({
    root: FRONTEND_ROOT,
    envFile: ENV_FILE,
    nodeEnv: NODE_ENV,
    isDevelopment: NODE_ENV === 'development',
    isTest: NODE_ENV === 'test',
    isProduction,
    appName: layChuoi('APP_NAME', 'Transform'),
    appVersion: layChuoi('APP_VERSION', '1.0.0'),
    host: layChuoi('HOST', '0.0.0.0'),
    port: laySoNguyen('PORT', 2320, 1, 65535),
    publicBaseUrl: layChuoi('PUBLIC_BASE_URL', ''),
    trustProxy: layTrustProxy(),
    apiBaseUrl: layChuoi('API_BASE_URL', 'http://127.0.0.1:2310/api/v1'),
    apiTimeoutMs: laySoNguyen('API_TIMEOUT_MS', 30000, 1000),
    sessionSecret,
    sessionName: layChuoi('SESSION_NAME', 'transform.sid'),
    sessionMaxAgeMs: laySoNguyen('SESSION_MAX_AGE_MS', 604800000, 60000),
    sessionSecure: layBoolean('SESSION_SECURE', isProduction),
    sessionSameSite: laySameSite(),
    sessionRedisPrefix: layChuoi('SESSION_REDIS_PREFIX', 'transform:frontend:session:'),
    sessionRedisTtlSeconds: laySoNguyen('SESSION_REDIS_TTL_SECONDS', 604800, 60),
    redisUrl: layChuoi('REDIS_URL', ''),
    redisHost: layChuoi('REDIS_HOST', '127.0.0.1'),
    redisPort: laySoNguyen('REDIS_PORT', 6379, 1, 65535),
    redisUsername: layChuoi('REDIS_USERNAME', ''),
    redisPassword: layChuoi('REDIS_PASSWORD', ''),
    redisDb: laySoNguyen('REDIS_DB', 0, 0),
    redisTls: layBoolean('REDIS_TLS', false),
    redisConnectTimeoutMs: laySoNguyen('REDIS_CONNECT_TIMEOUT_MS', 10000, 1000),
    redisKeepAliveMs: laySoNguyen('REDIS_KEEP_ALIVE_MS', 10000, 0),
    redisMaxRetriesPerRequest: laySoNguyen('REDIS_MAX_RETRIES_PER_REQUEST', 1, 0),
    csrfEnabled: layBoolean('CSRF_ENABLED', true),
    csrfHeader: layChuoi('CSRF_HEADER', 'x-csrf-token').toLowerCase(),
    jsonLimit: layChuoi('HTTP_JSON_LIMIT', '2mb'),
    urlencodedLimit: layChuoi('HTTP_URLENCODED_LIMIT', '2mb'),
    assetMaxAgeMs: laySoNguyen('ASSET_MAX_AGE_MS', isProduction ? 31536000000 : 0, 0),
    htmlMinify: layBoolean('HTML_MINIFY', isProduction),
    shutdownTimeoutMs: laySoNguyen('SHUTDOWN_TIMEOUT_MS', 10000, 1000),
    requestTimeoutMs: laySoNguyen('REQUEST_TIMEOUT_MS', 300000, 1000)
});