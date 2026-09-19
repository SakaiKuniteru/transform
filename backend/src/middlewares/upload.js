'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');
const env = require('../config/env');

function layTempDir() {
    const root = path.isAbsolute(env.storage.root)
        ? env.storage.root
        : path.resolve(env.backendRoot, env.storage.root);
    return path.resolve(root, env.storage.tempDir);
}

const TEMP_DIR = layTempDir();
fs.mkdirSync(TEMP_DIR, { recursive: true });

function chuanHoaTenTep(tenTep) {
    const ten = path.basename(String(tenTep || '').replaceAll('\\', '/')).trim();
    if (!ten) { return 'tep'; }
    return ten.replace(/[\x00-\x1F\x7F]/g, '');
}

function layPhanMoRong(tenTep) {
    const extension = path.extname(chuanHoaTenTep(tenTep));
    if (!extension || extension.length > 20) { return ''; }
    return extension.toLowerCase();
}

const storage = multer.diskStorage({
    destination(req, file, callback) {
        callback(null, TEMP_DIR);
    },
    filename(req, file, callback) {
        file.originalname = chuanHoaTenTep(file.originalname);
        callback(
            null,
            `${Date.now()}-${crypto.randomUUID()}${layPhanMoRong(file.originalname)}`
        );
    }
});

function fileFilter(req, file, callback) {
    file.originalname = chuanHoaTenTep(file.originalname);
    if (!file.originalname) {
        return callback(new Error('Tên tệp upload không hợp lệ.'));
    }
    return callback(null, true);
}

function layGioiHanUpload(req) {
    const chinhSach = req.uploadPolicy || {};

    const maxFileSizeBytes = Math.min(
        Number(chinhSach.kichThuocToiDaMoiTepBytes || env.baoMat.uploadMaxFileSizeMb * 1024 * 1024),
        env.baoMat.uploadMaxFileSizeMb * 1024 * 1024
    );

    const maxFiles = Math.min(
        Number(chinhSach.soTepToiDaMoiLan || env.baoMat.uploadMaxFiles),
        env.baoMat.uploadMaxFiles
    );

    if (!Number.isSafeInteger(maxFileSizeBytes) || maxFileSizeBytes <= 0) {
        throw new TypeError('Kích thước tối đa mỗi tệp không hợp lệ.');
    }

    if (!Number.isSafeInteger(maxFiles) || maxFiles <= 0) {
        throw new TypeError('Số tệp tối đa mỗi lần tải không hợp lệ.');
    }

    return {
        maxFileSizeBytes,
        maxFiles
    };
}

function taoUpload(req) {
    const gioiHan = layGioiHanUpload(req);
    return multer({
        storage,
        fileFilter,
        limits: {
            fileSize: gioiHan.maxFileSizeBytes,
            files: gioiHan.maxFiles,
            fields: env.baoMat.uploadMaxFields,
            fieldSize: Math.floor(env.baoMat.uploadMaxFieldSizeMb * 1024 * 1024)
        }
    });
}

function uploadMotTep(fieldName = 'tep') {
    if (typeof fieldName !== 'string' || !fieldName.trim()) { throw new TypeError('Tên field upload không hợp lệ.'); }
    return (req, res, next) => taoUpload(req).single(fieldName.trim())(req, res, next);
}

function uploadNhieuTep(fieldName = 'teps') {
    if (typeof fieldName !== 'string' || !fieldName.trim()) { throw new TypeError('Tên field upload không hợp lệ.'); }
    return (req, res, next) => {
        const { maxFiles } = layGioiHanUpload(req);
        return taoUpload(req).array(fieldName.trim(), maxFiles)(req, res, next);
    };
}

function uploadTheoFields(fields) {
    if (!Array.isArray(fields) || fields.length === 0) { throw new TypeError('Danh sách field upload không hợp lệ.'); }
    return (req, res, next) => {
        const { maxFiles } = layGioiHanUpload(req);
        let tongSoTep = 0;
        const danhSach = fields.map((item) => {
            if (!item || typeof item.name !== 'string' || !item.name.trim()) { throw new TypeError('Tên field upload không hợp lệ.'); }
            const maxCount = item.maxCount ?? 1;
            if (!Number.isSafeInteger(maxCount) || maxCount <= 0) { throw new TypeError('maxCount của field upload không hợp lệ.'); }
            tongSoTep += maxCount;
            return {
                name: item.name.trim(),
                maxCount
            };
        });
        if (tongSoTep > maxFiles) { throw new TypeError(`Tổng số tệp của các field không được vượt quá ${maxFiles}.`); }
        return taoUpload(req).fields(danhSach)(req, res, next);
    };
}

function layDanhSachTep(req) {
    const danhSach = [];
    if (req.file) { danhSach.push(req.file); }
    if (Array.isArray(req.files)) {
        danhSach.push(...req.files);
    } else if (req.files && typeof req.files === 'object') {
        Object.values(req.files).forEach((files) => {
            if (Array.isArray(files)) { danhSach.push(...files); }
        });
    }
    return danhSach;
}

function laTepTamHopLe(duongDan) {
    if (!duongDan) { return false; }
    const absolute = path.resolve(duongDan);
    const relative = path.relative(TEMP_DIR, absolute);
    return Boolean(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

async function xoaTepTam(file) {
    if (!file?.path || !laTepTamHopLe(file.path)) { return false; }
    try {
        await fs.promises.rm(file.path, { force: true });
        return true;
    } catch {
        return false;
    }
}

async function xoaTepTamTrongRequest(req) {
    const danhSach = layDanhSachTep(req);
    await Promise.allSettled(
        danhSach.map((file) => xoaTepTam(file))
    );
}

module.exports = {
    TEMP_DIR,
    layGioiHanUpload,
    uploadMotTep,
    uploadNhieuTep,
    uploadTheoFields,
    layDanhSachTep,
    xoaTepTam,
    xoaTepTamTrongRequest
};