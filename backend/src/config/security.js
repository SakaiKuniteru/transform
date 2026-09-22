'use strict';

const env = require('./env');
const MA_LOI = require('../constants/ma-loi');
const { loiKhongCoQuyen } = require('../utils/loi');
/*
 * ============================================================
 * JWT
 * ============================================================
 */

const JWT_CONFIG = Object.freeze({
    access: Object.freeze({
        secret: env.baoMat.jwtAccessSecret,
        expiresIn: env.baoMat.jwtAccessExpiresIn,
        issuer: env.baoMat.jwtIssuer,
        audience: env.baoMat.jwtAudience,
        algorithm: 'HS256'
    }),

    refresh: Object.freeze({
        secret: env.baoMat.jwtRefreshSecret,
        expiresIn: env.baoMat.jwtRefreshExpiresIn,
        issuer: env.baoMat.jwtIssuer,
        audience: env.baoMat.jwtAudience,
        algorithm: 'HS256'
    })
});

/*
 * ============================================================
 * MẬT KHẨU
 * ============================================================
 */

const PASSWORD_CONFIG = Object.freeze({
    bcryptRounds: env.baoMat.bcryptRounds,
    minLength: env.baoMat.passwordMinLength,
    maxLength: env.baoMat.passwordMaxLength
});

/*
 * ============================================================
 * COOKIE
 * ============================================================
 */

const COOKIE_CONFIG = Object.freeze({
    secret: env.baoMat.cookieSecret,
    refreshTokenName: env.baoMat.refreshCookieName,
    guestTokenName: env.baoMat.guestSessionCookieName,
    refreshTokenOptions: Object.freeze({
        httpOnly: true,
        secure: env.baoMat.cookieSecure,
        sameSite: env.baoMat.cookieSameSite,
        domain: env.baoMat.cookieDomain || undefined,
        path: `${env.ungDung.apiPrefix}/xac-thuc`,
        maxAge: env.baoMat.refreshCookieMaxAgeMs
    }),
    guestTokenOptions: Object.freeze({
        httpOnly: true,
        secure: env.baoMat.cookieSecure,
        sameSite: env.baoMat.cookieSameSite,
        domain: env.baoMat.cookieDomain || undefined,
        path: env.ungDung.apiPrefix,
        maxAge: env.baoMat.guestSessionTtlMs,
        signed: true
    })
});

/*
 * ============================================================
 * CORS
 * ============================================================
 */

const CORS_CONFIG = Object.freeze({
    origins: Object.freeze([
        ...env.baoMat.corsOrigins
    ]),
    credentials: env.baoMat.corsCredentials,
    maxAge: env.baoMat.corsMaxAgeSeconds
});

function kiemTraCorsOrigin(origin, callback) {
    if (!origin) { return callback(null, true); }
    if (origin && (CORS_CONFIG.origins.includes('*') || CORS_CONFIG.origins.includes(origin))) {
        return callback(null, true);
    }
    const error = loiKhongCoQuyen('Nguồn truy cập không được CORS cho phép.', MA_LOI.CORS_KHONG_DUOC_PHEP);
    error.code = 'CORS_NOT_ALLOWED';
    return callback(error);
}

const CORS_OPTIONS = Object.freeze({
    origin: kiemTraCorsOrigin,
    credentials: CORS_CONFIG.credentials,
    methods: Object.freeze([
        'GET',
        'HEAD',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS'
    ]),
    allowedHeaders: Object.freeze([
        'Accept',
        'Authorization',
        'Content-Type',
        'Range',
        'If-None-Match',
        'X-Request-Id'
    ]),
    exposedHeaders: Object.freeze([
        'Accept-Ranges',
        'Content-Disposition',
        'Content-Length',
        'Content-Range',
        'ETag',
        'Last-Modified',
        'X-Request-Id',
        'RateLimit-Limit',
        'RateLimit-Remaining',
        'RateLimit-Reset',
        'Retry-After'
    ]),

    maxAge: CORS_CONFIG.maxAge,
    optionsSuccessStatus: 204
});

/*
 * ============================================================
 * RATE LIMIT
 * ============================================================
 */

const RATE_LIMIT_CONFIG = Object.freeze({
    macDinh: Object.freeze({
        windowMs: env.baoMat.rateLimitWindowMs,
        max: env.baoMat.rateLimitMax
    }),

    xacThuc: Object.freeze({
        windowMs: env.baoMat.authRateLimitWindowMs,
        max: env.baoMat.authRateLimitMax
    })
});

/*
 * ============================================================
 * UPLOAD
 * ============================================================
 */

const UPLOAD_CONFIG = Object.freeze({
    maxFileSizeBytes: Math.floor(env.baoMat.uploadMaxFileSizeMb * 1024 * 1024),
    maxFiles: env.baoMat.uploadMaxFiles,
    maxFields: env.baoMat.uploadMaxFields,
    maxFieldSizeBytes: Math.floor(env.baoMat.uploadMaxFieldSizeMb * 1024 * 1024)
});

/*
 * ============================================================
 * HELMET
 * ============================================================
 */

const HELMET_OPTIONS = Object.freeze({
    crossOriginResourcePolicy: Object.freeze({
        policy: 'cross-origin'
    })
});

module.exports = {
    JWT_CONFIG,
    PASSWORD_CONFIG,
    COOKIE_CONFIG,
    CORS_CONFIG,
    CORS_OPTIONS,
    RATE_LIMIT_CONFIG,
    UPLOAD_CONFIG,
    HELMET_OPTIONS,
    kiemTraCorsOrigin
};