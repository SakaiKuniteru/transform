'use strict';

function apDungMoiTruongTest(options = {}) {
    const storageDriver = options.storageDriver || process.env.TEST_STORAGE_DRIVER || 'local';
    process.env.NODE_ENV = 'test';
    process.env.DB_URL = '';
    process.env.DB_NAME = process.env.TEST_DB_NAME || 'transform_test';
    process.env.REDIS_DB = String(process.env.TEST_REDIS_DB || 15);
    process.env.QUEUE_PREFIX = process.env.TEST_QUEUE_PREFIX || 'transform-test';
    process.env.RATE_LIMIT_MAX = process.env.TEST_RATE_LIMIT_MAX || '10000';
    process.env.AUTH_RATE_LIMIT_MAX = process.env.TEST_AUTH_RATE_LIMIT_MAX || '10000';
    process.env.STORAGE_DRIVER = storageDriver;
    process.env.STORAGE_ROOT = process.env.TEST_STORAGE_ROOT || './storage-test';
    process.env.STORAGE_TEMP_CLEANER_ENABLED = 'false';
    process.env.COOKIE_SECURE = 'false';
    if (storageDriver === 'minio') { process.env.MINIO_BUCKET = process.env.TEST_MINIO_BUCKET || 'transform-test'; }
    return {
        database: process.env.DB_NAME,
        redisDb: Number(process.env.REDIS_DB),
        queuePrefix: process.env.QUEUE_PREFIX,
        storageDriver
    };
}

module.exports = {
    apDungMoiTruongTest
};