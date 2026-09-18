'use strict';

const path = require('node\:path');
const env = require('./env');

const STORAGE_DRIVER = Object.freeze({
    LOCAL: 'local',
    MINIO: 'minio'
});

function resolveStoragePath(value) {
    if (path.isAbsolute(value)) {
        return path.normalize(value);
    }

    return path.resolve(env.backendRoot, value);
}

function chuanHoaPrefixMinio(value) {
    if (!value) {
        return '';
    }

    return String(value)
        .replace(/^\/+/, '')
        .replace(/\/+$/, '');
}


const root = resolveStoragePath(env.storage.root);

const STORAGE_CONFIG = Object.freeze({
    driver: env.storage.driver,
    root,
    originalDir: path.resolve(root, env.storage.originalDir),
    workingDir: path.resolve(root, env.storage.workingDir),
    outputDir: path.resolve(root, env.storage.outputDir),
    tempDir: path.resolve(root, env.storage.tempDir),
    signedUrlExpiresSeconds: env.storage.signedUrlExpiresSeconds,

    minio: Object.freeze({
        endPoint: env.storage.minio.endpoint,
        port: env.storage.minio.port,
        useSSL: env.storage.minio.useSSL,
        accessKey: env.storage.minio.accessKey,
        secretKey: env.storage.minio.secretKey,
        bucket: env.storage.minio.bucket,
        region: env.storage.minio.region,
        prefix: chuanHoaPrefixMinio(env.storage.minio.prefix)
    })
});

function laLocal() {
    return STORAGE_CONFIG.driver === STORAGE_DRIVER.LOCAL;
}

function laMinio() {
    return STORAGE_CONFIG.driver === STORAGE_DRIVER.MINIO;
}

function layThuMucTheoLoai(loai) {
    const thuMuc = {
        original: STORAGE_CONFIG.originalDir,
        working: STORAGE_CONFIG.workingDir,
        output: STORAGE_CONFIG.outputDir,
        temp: STORAGE_CONFIG.tempDir
    };

    return thuMuc[loai] || null;
}

function taoMinioClientConfig() {
    return {
        endPoint: STORAGE_CONFIG.minio.endPoint,
        port: STORAGE_CONFIG.minio.port,
        useSSL: STORAGE_CONFIG.minio.useSSL,
        accessKey: STORAGE_CONFIG.minio.accessKey,
        secretKey: STORAGE_CONFIG.minio.secretKey,
        region: STORAGE_CONFIG.minio.region
    };
}

module.exports = {
    STORAGE_DRIVER,
    STORAGE_CONFIG,
    laLocal,
    laMinio,
    layThuMucTheoLoai,
    taoMinioClientConfig
};