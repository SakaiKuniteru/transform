'use strict';

const path = require('node:path');
const dotenv = require('dotenv');
const Joi = require('joi');

const BACKEND_ROOT = path.resolve(__dirname, '../..');

const ENV_FILE = process.env.ENV_FILE
    ? path.resolve(process.env.ENV_FILE)
    : path.join(BACKEND_ROOT, '.env');

dotenv.config({
    path: ENV_FILE,
    quiet: true
});

/*
 * ============================================================
 * VALIDATION
 * ============================================================
 */

const schema = Joi.object({
    /*
     * =========================================================
     * ỨNG DỤNG
     * =========================================================
     */

    NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
    APP_NAME: Joi.string().trim().min(1).default('transform-backend'),
    APP_VERSION: Joi.string().trim().min(1).default('1.0.0'),
    HOST: Joi.string().trim().min(1).default('0.0.0.0'),
    PORT: Joi.number().integer().min(1).max(65535).default(2310),
    PUBLIC_BASE_URL: Joi.string().uri({ allowRelative: false }).allow('').default(''),
    API_PREFIX: Joi.string().trim().pattern(/^\/[A-Za-z0-9/_-]*$/).default('/api/v1'),
    TRUST_PROXY: Joi.string().trim().default('false'),
    HTTP_JSON_LIMIT: Joi.string().trim().default('10mb'),
    HTTP_URLENCODED_LIMIT: Joi.string().trim().default('10mb'),
    REQUEST_TIMEOUT_MS: Joi.number().integer().min(1000).default(300000),

    /*
     * =========================================================
     * DATABASE
     * =========================================================
     */

    DB_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).allow('').default(''),
    DB_HOST: Joi.string().trim().min(1).default('127.0.0.1'),
    DB_PORT: Joi.number().integer().min(1).max(65535).default(5432),
    DB_NAME: Joi.string().trim().min(1).default('transform'),
    DB_USER: Joi.string().trim().min(1).default('postgres'),
    DB_PASSWORD: Joi.string().allow('').default(''),
    DB_SCHEMA: Joi.string().trim().pattern(/^[A-Za-z_][A-Za-z0-9_]*$/).default('public'),
    DB_SSL: Joi.boolean().truthy('true').falsy('false').default(false),
    DB_SSL_REJECT_UNAUTHORIZED: Joi.boolean().truthy('true').falsy('false').default(true),
    DB_POOL_MAX: Joi.number().integer().min(1).default(20),
    DB_IDLE_TIMEOUT_MS: Joi.number().integer().min(0).default(30000),
    DB_CONNECTION_TIMEOUT_MS: Joi.number().integer().min(0).default(10000),
    DB_STATEMENT_TIMEOUT_MS: Joi.number().integer().min(0).default(0),
    DB_QUERY_TIMEOUT_MS: Joi.number().integer().min(0).default(0),
    DB_APPLICATION_NAME: Joi.string().trim().min(1).default('transform-backend'),

    /*
     * =========================================================
     * REDIS
     * =========================================================
     */

    REDIS_URL: Joi.string().uri({ scheme: ['redis', 'rediss'] }).allow('').default(''),
    REDIS_HOST: Joi.string().trim().min(1).default('127.0.0.1'),
    REDIS_PORT: Joi.number().integer().min(1).max(65535).default(6379),
    REDIS_USERNAME: Joi.string().allow('').default(''),
    REDIS_PASSWORD: Joi.string().allow('').default(''),
    REDIS_DB: Joi.number().integer().min(0).default(0),
    REDIS_TLS: Joi.boolean().truthy('true').falsy('false').default(false),
    REDIS_CONNECT_TIMEOUT_MS: Joi.number().integer().min(1000).default(10000),
    REDIS_KEEP_ALIVE_MS: Joi.number().integer().min(0).default(10000),
    REDIS_MAX_RETRIES_PER_REQUEST: Joi.number().integer().min(0).default(1),

    /*
     * =========================================================
     * QUEUE
     * =========================================================
     */

    QUEUE_PREFIX: Joi.string().trim().pattern(/^[A-Za-z0-9_-]+$/).default('transform'),
    QUEUE_DEFAULT_ATTEMPTS: Joi.number().integer().min(1).default(3),
    QUEUE_BACKOFF_TYPE: Joi.string().valid('fixed', 'exponential').default('exponential'),
    QUEUE_BACKOFF_DELAY_MS: Joi.number().integer().min(0).default(5000),
    QUEUE_REMOVE_COMPLETE_AGE_SECONDS: Joi.number().integer().min(0).default(86400),
    QUEUE_REMOVE_COMPLETE_COUNT: Joi.number().integer().min(0).default(1000),
    QUEUE_REMOVE_FAIL_AGE_SECONDS: Joi.number().integer().min(0).default(604800),
    QUEUE_REMOVE_FAIL_COUNT: Joi.number().integer().min(0).default(5000),
    QUEUE_LOCK_DURATION_MS: Joi.number().integer().min(1000).default(300000),
    QUEUE_STALLED_INTERVAL_MS: Joi.number().integer().min(1000).default(30000),
    QUEUE_MAX_STALLED_COUNT: Joi.number().integer().min(0).default(1),
    QUEUE_CONCURRENCY_DEFAULT: Joi.number().integer().min(1).default(2),
    QUEUE_CONCURRENCY_TAI_LIEU: Joi.number().integer().min(1).default(2),
    QUEUE_CONCURRENCY_DU_LIEU: Joi.number().integer().min(1).default(4),
    QUEUE_CONCURRENCY_NEN: Joi.number().integer().min(1).default(2),
    QUEUE_CONCURRENCY_HINH_ANH: Joi.number().integer().min(1).default(4),
    QUEUE_CONCURRENCY_OCR: Joi.number().integer().min(1).default(1),
    QUEUE_CONCURRENCY_DICH: Joi.number().integer().min(1).default(2),
    QUEUE_CONCURRENCY_AI: Joi.number().integer().min(1).default(1),

    /*
     * =========================================================
     * STORAGE
     * =========================================================
     */

    STORAGE_DRIVER: Joi.string().valid('local', 'minio').default('local'),
    STORAGE_ROOT: Joi.string().trim().min(1).default('./storage'),
    STORAGE_ORIGINAL_DIR: Joi.string().trim().min(1).default('original'),
    STORAGE_WORKING_DIR: Joi.string().trim().min(1).default('working'),
    STORAGE_OUTPUT_DIR: Joi.string().trim().min(1).default('output'),
    STORAGE_TEMP_DIR: Joi.string().trim().min(1).default('working/tmp'),
    STORAGE_SIGNED_URL_EXPIRES_SECONDS: Joi.number().integer().min(1).default(900),

    /*
     * =========================================================
     * MINIO
     * =========================================================
     */

    MINIO_ENDPOINT: Joi.string().trim().default('127.0.0.1'),
    MINIO_PORT: Joi.number().integer().min(1).max(65535).default(9000),
    MINIO_USE_SSL: Joi.boolean().truthy('true').falsy('false').default(false),

    MINIO_ACCESS_KEY: Joi.when(
        'STORAGE_DRIVER',
        {
            is: 'minio',
            then: Joi.string().min(3).required(),
            otherwise: Joi.string().allow('').default('')
        }
    ),

    MINIO_SECRET_KEY: Joi.when(
        'STORAGE_DRIVER',
        {
            is: 'minio',
            then: Joi.string().min(8).required(),
            otherwise: Joi.string().allow('').default('')
        }
    ),

    MINIO_BUCKET: Joi.when(
        'STORAGE_DRIVER',
        {
            is: 'minio',
            then: Joi.string().trim().min(3).max(63).required(),
            otherwise: Joi.string().default('transform')
        }
    ),

    MINIO_REGION: Joi.string().trim().min(1).default('us-east-1'),
    MINIO_PREFIX: Joi.string().allow('').default(''),

    /*
     * =========================================================
     * JWT
     * =========================================================
     */

    JWT_ACCESS_SECRET: Joi.string().min(32).required(),
    JWT_ACCESS_EXPIRES_IN: Joi.string().trim().pattern(/^\d+(ms|s|m|h|d|w|y)$/).default('15m'),
    JWT_REFRESH_SECRET: Joi.string().min(32).required(),
    JWT_REFRESH_EXPIRES_IN: Joi.string().trim().pattern(/^\d+(ms|s|m|h|d|w|y)$/).default('30d'),
    JWT_ISSUER: Joi.string().trim().min(1).default('transform-backend'),
    JWT_AUDIENCE: Joi.string().trim().min(1).default('transform-client'),

    /*
     * =========================================================
     * MẬT KHẨU
     * =========================================================
     */

    BCRYPT_ROUNDS: Joi.number().integer().min(10).max(15).default(12),
    PASSWORD_MIN_LENGTH: Joi.number().integer().min(8).default(10),
    PASSWORD_MAX_LENGTH: Joi.number().integer().min(16).default(128),

    /*
     * =========================================================
     * COOKIE
     * =========================================================
     */

    COOKIE_SECRET: Joi.string().min(32).required(),
    AUTH_REFRESH_COOKIE_NAME: Joi.string().trim().min(1).default('transform_refresh_token'),
    AUTH_REFRESH_COOKIE_MAX_AGE_MS: Joi.number().integer().min(60000).default(2592000000),
    COOKIE_SECURE: Joi.boolean().truthy('true').falsy('false').default(false),
    COOKIE_SAME_SITE: Joi.string().lowercase().valid('lax', 'strict', 'none').default('lax'),
    COOKIE_DOMAIN: Joi.string().allow('').default(''),

    /*
     * =========================================================
     * CORS
     * =========================================================
     */

    CORS_ORIGINS: Joi.string().trim().default('http://localhost:2320,http://127.0.0.1:2320'),
    CORS_CREDENTIALS: Joi.boolean().truthy('true').falsy('false').default(true),
    CORS_ALLOW_NO_ORIGIN: Joi.boolean().truthy('true').falsy('false').default(true),
    CORS_MAX_AGE_SECONDS: Joi.number().integer().min(0).default(86400),

    /*
     * =========================================================
     * RATE LIMIT
     * =========================================================
     */

    RATE_LIMIT_WINDOW_MS: Joi.number().integer().min(1000).default(60000),
    RATE_LIMIT_MAX: Joi.number().integer().min(1).default(120),
    AUTH_RATE_LIMIT_WINDOW_MS: Joi.number().integer().min(1000).default(900000),
    AUTH_RATE_LIMIT_MAX: Joi.number().integer().min(1).default(10),

    /*
     * =========================================================
     * UPLOAD
     * =========================================================
     */

    UPLOAD_MAX_FILE_SIZE_MB: Joi.number().positive().default(200),
    UPLOAD_MAX_FILES: Joi.number().integer().min(1).default(20),
    UPLOAD_MAX_FIELDS: Joi.number().integer().min(1).default(50),
    UPLOAD_MAX_FIELD_SIZE_MB: Joi.number().positive().default(2),

    /*
     * =========================================================
     * PROCESS
     * =========================================================
     */

    PROCESS_DEFAULT_TIMEOUT_MS: Joi.number().integer().min(1000).default(300000),
    PROCESS_MAX_BUFFER_BYTES: Joi.number().integer().min(1024).default(10485760),

    /*
     * =========================================================
     * CÔNG CỤ
     * =========================================================
     */

    LIBREOFFICE_BIN: Joi.string().trim().min(1).default('soffice'),
    PANDOC_BIN: Joi.string().trim().min(1).default('pandoc'),
    TESSERACT_BIN: Joi.string().trim().min(1).default('tesseract'),
    SEVENZIP_BIN: Joi.string().trim().min(1).default('7zz'),
    PDFTOTEXT_BIN: Joi.string().trim().min(1).default('pdftotext'),
    PDFTOPPM_BIN: Joi.string().trim().min(1).default('pdftoppm'),
    QPDF_BIN: Joi.string().trim().min(1).default('qpdf'),
    GHOSTSCRIPT_BIN: Joi.string().trim().min(1).default('gs'),

    /*
     * =========================================================
     * AI
     * =========================================================
     */

    AI_PROVIDER: Joi.string().trim().allow('').default(''),
    AI_BASE_URL: Joi.string().uri({ allowRelative: false }).allow('').default(''),
    AI_API_KEY: Joi.string().allow('').default(''),
    AI_MODEL: Joi.string().trim().allow('').default(''),
    AI_TIMEOUT_MS: Joi.number().integer().min(1000).default(120000),

    /*
     * =========================================================
     * DỊCH
     * =========================================================
     */

    TRANSLATION_PROVIDER: Joi.string().trim().allow('').default(''),
    TRANSLATION_BASE_URL: Joi.string().uri({ allowRelative: false }).allow('').default(''),
    TRANSLATION_API_KEY: Joi.string().allow('').default(''),
    TRANSLATION_TIMEOUT_MS: Joi.number().integer().min(1000).default(120000)
}).unknown(true);

const { value, error } = schema.validate(
    process.env,
    {
        abortEarly: false,
        convert: true
    }
);

if (error) {
    const chiTiet = error.details.map((item) => `- ${item.message}`).join('\n');

    throw new Error(`Cấu hình môi trường Backend không hợp lệ:\n${chiTiet}`);
}

/*
 * ============================================================
 * HELPER
 * ============================================================
 */

function tachDanhSach(value) {
    if (!value) {
        return [];
    }

    return String(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function chuanHoaTrustProxy(value) {
    const text = String(value).trim().toLowerCase();

    if (text === 'true') {
        return true;
    }

    if (text === 'false' || text === '') {
        return false;
    }

    if (/^\d+$/.test(text)) {
        return Number(text);
    }

    return value;
}

function dongBangSau(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
        return value;
    }

    Object.values(value).forEach(dongBangSau);

    return Object.freeze(value);
}

/*
 * ============================================================
 * CONFIG
 * ============================================================
 */

const config = {
    backendRoot: BACKEND_ROOT,
    envFile: ENV_FILE,
    moiTruong: value.NODE_ENV,
    laDevelopment: value.NODE_ENV === 'development',
    laTest: value.NODE_ENV === 'test',
    laProduction: value.NODE_ENV === 'production',

    ungDung: {
        ten: value.APP_NAME,
        phienBan: value.APP_VERSION,
        host: value.HOST,
        port: value.PORT,
        publicBaseUrl: value.PUBLIC_BASE_URL || null,
        apiPrefix: value.API_PREFIX.replace(/\/+$/, '') || '/',
        trustProxy: chuanHoaTrustProxy(value.TRUST_PROXY),
        jsonLimit: value.HTTP_JSON_LIMIT,
        urlencodedLimit: value.HTTP_URLENCODED_LIMIT,
        requestTimeoutMs: value.REQUEST_TIMEOUT_MS
    },

    database: {
        url: value.DB_URL || null,
        host: value.DB_HOST,
        port: value.DB_PORT,
        name: value.DB_NAME,
        user: value.DB_USER,
        password: value.DB_PASSWORD,
        schema: value.DB_SCHEMA,
        ssl: value.DB_SSL,
        sslRejectUnauthorized: value.DB_SSL_REJECT_UNAUTHORIZED,
        poolMax: value.DB_POOL_MAX,
        idleTimeoutMs: value.DB_IDLE_TIMEOUT_MS,
        connectionTimeoutMs: value.DB_CONNECTION_TIMEOUT_MS,
        statementTimeoutMs: value.DB_STATEMENT_TIMEOUT_MS,
        queryTimeoutMs: value.DB_QUERY_TIMEOUT_MS,
        applicationName: value.DB_APPLICATION_NAME
    },

    redis: {
        url: value.REDIS_URL || null,
        host: value.REDIS_HOST,
        port: value.REDIS_PORT,
        username: value.REDIS_USERNAME || null,
        password: value.REDIS_PASSWORD || null,
        db: value.REDIS_DB,
        tls: value.REDIS_TLS || String(value.REDIS_URL).startsWith('rediss://'),
        connectTimeoutMs: value.REDIS_CONNECT_TIMEOUT_MS,
        keepAliveMs: value.REDIS_KEEP_ALIVE_MS,
        maxRetriesPerRequest: value.REDIS_MAX_RETRIES_PER_REQUEST
    },

    queue: {
        prefix: value.QUEUE_PREFIX,
        defaultAttempts: value.QUEUE_DEFAULT_ATTEMPTS,
        backoffType: value.QUEUE_BACKOFF_TYPE,
        backoffDelayMs: value.QUEUE_BACKOFF_DELAY_MS,
        removeCompleteAgeSeconds: value.QUEUE_REMOVE_COMPLETE_AGE_SECONDS,
        removeCompleteCount: value.QUEUE_REMOVE_COMPLETE_COUNT,
        removeFailAgeSeconds: value.QUEUE_REMOVE_FAIL_AGE_SECONDS,
        removeFailCount: value.QUEUE_REMOVE_FAIL_COUNT,
        lockDurationMs: value.QUEUE_LOCK_DURATION_MS,
        stalledIntervalMs: value.QUEUE_STALLED_INTERVAL_MS,
        maxStalledCount: value.QUEUE_MAX_STALLED_COUNT,

        concurrency: {
            default: value.QUEUE_CONCURRENCY_DEFAULT,
            taiLieu: value.QUEUE_CONCURRENCY_TAI_LIEU,
            duLieu: value.QUEUE_CONCURRENCY_DU_LIEU,
            nen: value.QUEUE_CONCURRENCY_NEN,
            hinhAnh: value.QUEUE_CONCURRENCY_HINH_ANH,
            ocr: value.QUEUE_CONCURRENCY_OCR,
            dich: value.QUEUE_CONCURRENCY_DICH,
            ai: value.QUEUE_CONCURRENCY_AI
        }
    },

    storage: {
        driver: value.STORAGE_DRIVER,
        root: value.STORAGE_ROOT,
        originalDir: value.STORAGE_ORIGINAL_DIR,
        workingDir: value.STORAGE_WORKING_DIR,
        outputDir: value.STORAGE_OUTPUT_DIR,
        tempDir: value.STORAGE_TEMP_DIR,
        signedUrlExpiresSeconds: value.STORAGE_SIGNED_URL_EXPIRES_SECONDS,

        minio: {
            endpoint: value.MINIO_ENDPOINT,
            port: value.MINIO_PORT,
            useSSL: value.MINIO_USE_SSL,
            accessKey: value.MINIO_ACCESS_KEY,
            secretKey: value.MINIO_SECRET_KEY,
            bucket: value.MINIO_BUCKET,
            region: value.MINIO_REGION,
            prefix: value.MINIO_PREFIX
        }
    },

    baoMat: {
        jwtAccessSecret: value.JWT_ACCESS_SECRET,
        jwtAccessExpiresIn: value.JWT_ACCESS_EXPIRES_IN,
        jwtRefreshSecret: value.JWT_REFRESH_SECRET,
        jwtRefreshExpiresIn: value.JWT_REFRESH_EXPIRES_IN,
        jwtIssuer: value.JWT_ISSUER,
        jwtAudience: value.JWT_AUDIENCE,
        bcryptRounds: value.BCRYPT_ROUNDS,
        cookieSecret: value.COOKIE_SECRET,
        refreshCookieName: value.AUTH_REFRESH_COOKIE_NAME,
        refreshCookieMaxAgeMs: value.AUTH_REFRESH_COOKIE_MAX_AGE_MS,
        cookieSecure: value.COOKIE_SECURE,
        cookieSameSite: value.COOKIE_SAME_SITE,
        cookieDomain: value.COOKIE_DOMAIN || null,
        corsOrigins: tachDanhSach(value.CORS_ORIGINS),
        corsCredentials: value.CORS_CREDENTIALS,
        corsAllowNoOrigin: value.CORS_ALLOW_NO_ORIGIN,
        corsMaxAgeSeconds: value.CORS_MAX_AGE_SECONDS,
        rateLimitWindowMs: value.RATE_LIMIT_WINDOW_MS,
        rateLimitMax: value.RATE_LIMIT_MAX,
        authRateLimitWindowMs: value.AUTH_RATE_LIMIT_WINDOW_MS,
        authRateLimitMax: value.AUTH_RATE_LIMIT_MAX,
        passwordMinLength: value.PASSWORD_MIN_LENGTH,
        passwordMaxLength: value.PASSWORD_MAX_LENGTH,
        uploadMaxFileSizeMb: value.UPLOAD_MAX_FILE_SIZE_MB,
        uploadMaxFiles: value.UPLOAD_MAX_FILES,
        uploadMaxFields: value.UPLOAD_MAX_FIELDS,
        uploadMaxFieldSizeMb: value.UPLOAD_MAX_FIELD_SIZE_MB
    },

    congCu: {
        defaultTimeoutMs: value.PROCESS_DEFAULT_TIMEOUT_MS,
        maxBufferBytes: value.PROCESS_MAX_BUFFER_BYTES,
        libreoffice: value.LIBREOFFICE_BIN,
        pandoc: value.PANDOC_BIN,
        tesseract: value.TESSERACT_BIN,
        sevenzip: value.SEVENZIP_BIN,
        pdftotext: value.PDFTOTEXT_BIN,
        pdftoppm: value.PDFTOPPM_BIN,
        qpdf: value.QPDF_BIN,
        ghostscript: value.GHOSTSCRIPT_BIN
    },

    tichHop: {
        ai: {
            provider: value.AI_PROVIDER || null,
            baseUrl: value.AI_BASE_URL || null,
            apiKey: value.AI_API_KEY || null,
            model: value.AI_MODEL || null,
            timeoutMs: value.AI_TIMEOUT_MS
        },

        dich: {
            provider: value.TRANSLATION_PROVIDER || null,
            baseUrl: value.TRANSLATION_BASE_URL || null,
            apiKey: value.TRANSLATION_API_KEY || null,
            timeoutMs: value.TRANSLATION_TIMEOUT_MS
        }
    }
};

/*
 * ============================================================
 * KIỂM TRA QUAN HỆ CẤU HÌNH
 * ============================================================
 */

function kiemTraQuanHeCauHinh() {
    if (config.baoMat.passwordMinLength > config.baoMat.passwordMaxLength) {
        throw new Error('PASSWORD_MIN_LENGTH không được lớn hơn PASSWORD_MAX_LENGTH.');
    }

    if (config.baoMat.cookieSameSite === 'none' && !config.baoMat.cookieSecure) {
        throw new Error('COOKIE_SECURE phải bằng true khi COOKIE_SAME_SITE=none.');
    }
}

function kiemTraProduction() {
    if (!config.laProduction) { return; }

    const secretMau = [
        config.baoMat.jwtAccessSecret,
        config.baoMat.jwtRefreshSecret,
        config.baoMat.cookieSecret
    ].some((secret) => secret.startsWith('change-me-'));

    if (secretMau) {
        throw new Error('Không được sử dụng secret mẫu khi NODE_ENV=production.');
    }

    if (config.baoMat.corsOrigins.includes('*')) {
        throw new Error('Không được cấu hình CORS_ORIGINS=* khi NODE_ENV=production.');
    }

    if (!config.baoMat.cookieSecure) {
        throw new Error('COOKIE_SECURE phải bằng true khi NODE_ENV=production.');
    }
}

kiemTraQuanHeCauHinh();
kiemTraProduction();

module.exports = dongBangSau(config);