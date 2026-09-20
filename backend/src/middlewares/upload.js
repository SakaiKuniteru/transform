'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');
const env = require('../config/env');

function taoLoi(statusCode, message, code = 'LOI_UPLOAD') {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    return error;
}

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
        callback(null, `${Date.now()}-${crypto.randomUUID()}${layPhanMoRong(file.originalname)}`);
    }
});

function fileFilter(req, file, callback) {
    file.originalname = chuanHoaTenTep(file.originalname);
    if (!file.originalname) { return callback(taoLoi(400, 'Tên tệp upload không hợp lệ.', 'TEN_TEP_UPLOAD_KHONG_HOP_LE')); }
    return callback(null, true);
}

function layUploadPolicy(req) {
    if (!req.uploadPolicy?.daResolve) { throw taoLoi(500, 'Chính sách upload chưa được resolve trước khi nhận tệp.', 'UPLOAD_POLICY_CHUA_RESOLVE'); }
    return req.uploadPolicy;
}

function layGioiHanUpload(req) {
    const policy = layUploadPolicy(req);
    const hardFileSizeBytes = Math.floor(env.baoMat.uploadMaxFileSizeMb * 1024 * 1024);
    const hardMaxFiles = env.baoMat.uploadMaxFiles;
    const businessFileSizeBytes = policy.khongGioiHanKichThuocMoiTep
        ? hardFileSizeBytes
        : Number(policy.kichThuocToiDaMoiTepBytes);
    const businessMaxFiles = policy.khongGioiHanSoTepMoiLan
        ? hardMaxFiles
        : Number(policy.soTepToiDaMoiLan);
    if (!Number.isSafeInteger(hardFileSizeBytes) || hardFileSizeBytes <= 0) { throw new TypeError('Hard limit kích thước tệp không hợp lệ.'); }
    if (!Number.isSafeInteger(hardMaxFiles) || hardMaxFiles <= 0) { throw new TypeError('Hard limit số tệp không hợp lệ.'); }
    if (!Number.isSafeInteger(businessFileSizeBytes) || businessFileSizeBytes <= 0) { throw taoLoi(500, 'Kích thước tối đa mỗi tệp trong chính sách không hợp lệ.', 'UPLOAD_POLICY_KICH_THUOC_KHONG_HOP_LE'); }
    if (!Number.isSafeInteger(businessMaxFiles) || businessMaxFiles <= 0) { throw taoLoi(500, 'Số tệp tối đa mỗi lần trong chính sách không hợp lệ.', 'UPLOAD_POLICY_SO_TEP_KHONG_HOP_LE'); }
    return {
        maxFileSizeBytes: Math.min(businessFileSizeBytes, hardFileSizeBytes),
        maxFiles: Math.min(businessMaxFiles, hardMaxFiles)
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

function chuanHoaLoiUpload(error) {
    if (!(error instanceof multer.MulterError)) {
        if (!error.statusCode) { error.statusCode = 400; }
        return error;
    }
    const messageMap = {
        LIMIT_FILE_SIZE: 'Tệp vượt quá kích thước tối đa cho phép.',
        LIMIT_FILE_COUNT: 'Số lượng tệp vượt quá giới hạn cho phép.',
        LIMIT_FIELD_COUNT: 'Số lượng field multipart vượt quá giới hạn cho phép.',
        LIMIT_FIELD_VALUE: 'Dữ liệu field multipart vượt quá kích thước cho phép.',
        LIMIT_FIELD_KEY: 'Tên field multipart vượt quá giới hạn cho phép.',
        LIMIT_PART_COUNT: 'Số phần multipart vượt quá giới hạn cho phép.',
        LIMIT_UNEXPECTED_FILE: 'Field tệp upload không hợp lệ hoặc vượt quá số lượng cho phép.'
    };
    error.statusCode = ['LIMIT_FILE_SIZE', 'LIMIT_FILE_COUNT'].includes(error.code) ? 413 : 400;
    error.message = messageMap[error.code] || error.message || 'Dữ liệu upload không hợp lệ.';
    return error;
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
    await Promise.allSettled(danhSach.map((file) => xoaTepTam(file)));
}

function chayMulter(req, res, next, middleware) {
    const khiAbort = () => {
        void xoaTepTamTrongRequest(req);
    };
    req.once('aborted', khiAbort);
    return middleware(req, res, async (error) => {
        req.off('aborted', khiAbort);
        if (!error) { return next(); }
        await xoaTepTamTrongRequest(req);
        return next(chuanHoaLoiUpload(error));
    });
}

function uploadMotTep(fieldName = 'tep') {
    if (typeof fieldName !== 'string' || !fieldName.trim()) { throw new TypeError('Tên field upload không hợp lệ.'); }
    const tenField = fieldName.trim();
    return (req, res, next) => {
        try {
            return chayMulter(req, res, next, taoUpload(req).single(tenField));
        } catch (error) {
            return next(error);
        }
    };
}

function uploadNhieuTep(fieldName = 'teps') {
    if (typeof fieldName !== 'string' || !fieldName.trim()) { throw new TypeError('Tên field upload không hợp lệ.'); }
    const tenField = fieldName.trim();
    return (req, res, next) => {
        try {
            const { maxFiles } = layGioiHanUpload(req);
            return chayMulter(req, res, next, taoUpload(req).array(tenField, maxFiles));
        } catch (error) {
            return next(error);
        }
    };
}

function uploadTheoFields(fields) {
    if (!Array.isArray(fields) || fields.length === 0) { throw new TypeError('Danh sách field upload không hợp lệ.'); }
    return (req, res, next) => {
        try {
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
            if (tongSoTep > maxFiles) { throw taoLoi(400, `Tổng số tệp của các field không được vượt quá ${maxFiles}.`, 'UPLOAD_FIELDS_VUOT_GIOI_HAN'); }
            return chayMulter(req, res, next, taoUpload(req).fields(danhSach));
        } catch (error) {
            return next(error);
        }
    };
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