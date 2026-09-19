'use strict';

const path = require('node:path');
const crypto = require('node:crypto');
const env = require('../../config/env');
const LOAI_THU_MUC = Object.freeze({
    ORIGINAL: 'ORIGINAL',
    WORKING: 'WORKING',
    OUTPUT: 'OUTPUT'
});

let storageInstance = null;

function layRootLocal() {
    if (path.isAbsolute(env.storage.root)) { return env.storage.root; }
    return path.resolve(env.backendRoot, env.storage.root);
}

function taoStorage() {
    if (env.storage.driver === 'local') {
        const LocalStorage = require('./local-storage');
        return new LocalStorage({
            root: layRootLocal()
        });
    }
    if (env.storage.driver === 'minio') {
        const MinioStorage = require('./minio-storage');
        return new MinioStorage({
            endpoint: env.storage.minio.endpoint,
            port: env.storage.minio.port,
            useSSL: env.storage.minio.useSSL,
            accessKey: env.storage.minio.accessKey,
            secretKey: env.storage.minio.secretKey,
            bucket: env.storage.minio.bucket,
            region: env.storage.minio.region,
            prefix: env.storage.minio.prefix
        });
    }
    throw new Error(`Storage driver "${env.storage.driver}" không được hỗ trợ.`);
}

function layStorage() {
    if (!storageInstance) { storageInstance = taoStorage(); }
    return storageInstance;
}

function layThuMuc(loai) {
    switch (loai) {
        case LOAI_THU_MUC.ORIGINAL: return env.storage.originalDir;
        case LOAI_THU_MUC.WORKING: return env.storage.workingDir;
        case LOAI_THU_MUC.OUTPUT: return env.storage.outputDir;
        default: throw new TypeError('Loại thư mục lưu trữ không hợp lệ.');
    }
}

function layPhanMoRong(tenTep = '') {
    const extension = path.extname(String(tenTep)).toLowerCase();
    if (!extension || extension.length > 20) { return ''; }
    return extension;
}

function taoKhoaLuuTru({ loai = LOAI_THU_MUC.ORIGINAL, tenTep = '' } = {}) {
    const now = new Date();
    const nam = String(now.getUTCFullYear());
    const thang = String(now.getUTCMonth() + 1).padStart(2, '0');
    const ngay = String(now.getUTCDate()).padStart(2, '0');
    return path.posix.join(
        layThuMuc(loai),
        nam,
        thang,
        ngay,
        `${crypto.randomUUID()}${layPhanMoRong(tenTep)}`
    );
}

async function damBaoSanSang() {
    return layStorage().damBaoSanSang();
}

async function luuTuBuffer(khoa, buffer, options = {}) {
    return layStorage().luuTuBuffer(khoa, buffer, options);
}

async function luuTuTep(khoa, duongDanNguon, options = {}) {
    return layStorage().luuTuTep(khoa, duongDanNguon, options);
}

async function luuTepUpload(file, options = {}) {
    if (!file || typeof file !== 'object') { throw new TypeError('Tệp upload không hợp lệ.'); }
    const khoa = options.khoa || taoKhoaLuuTru({
        loai: options.loai || LOAI_THU_MUC.ORIGINAL,
        tenTep: file.originalname || file.filename || ''
    });
    const tuyChon = {
        contentType: file.mimetype || options.contentType || null,
        metadata: options.metadata || {}
    };
    if (file.path) { return luuTuTep(khoa, file.path, tuyChon); }
    if (Buffer.isBuffer(file.buffer)) { return luuTuBuffer(khoa, file.buffer, tuyChon); }
    throw new Error('Tệp upload không có path hoặc buffer.');
}

async function taoReadStream(khoa) {
    return layStorage().taoReadStream(khoa);
}

async function docBuffer(khoa) {
    return layStorage().docBuffer(khoa);
}

async function tonTai(khoa) {
    return layStorage().tonTai(khoa);
}

async function layThongTin(khoa) {
    return layStorage().layThongTin(khoa);
}

async function xoa(khoa) {
    return layStorage().xoa(khoa);
}

async function diChuyen(khoaNguon, khoaDich) {
    return layStorage().diChuyen(khoaNguon, khoaDich);
}

async function taoUrlTamThoi(khoa, expiresSeconds = env.storage.signedUrlExpiresSeconds) {
    return layStorage().taoUrlTamThoi(khoa, expiresSeconds);
}

module.exports = {
    LOAI_THU_MUC,
    layStorage,
    taoKhoaLuuTru,
    damBaoSanSang,
    luuTuBuffer,
    luuTuTep,
    luuTepUpload,
    taoReadStream,
    docBuffer,
    tonTai,
    layThongTin,
    xoa,
    diChuyen,
    taoUrlTamThoi
};