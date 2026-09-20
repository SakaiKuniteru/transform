'use strict';

const path = require('node:path');
const crypto = require('node:crypto');
const env = require('../../config/env');
const MA_LOI = require('../../constants/ma-loi');
const {
    laLoiUngDung,
    loiDichVuKhongKhaDung,
    loiHeThong
} = require('../../utils/loi');

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
            prefix: env.storage.minio.prefix,
            autoCreateBucket: !env.laProduction
        });
    }
    throw loiHeThong(`Storage driver "${env.storage.driver}" không được hỗ trợ.`, MA_LOI.STORAGE_CAU_HINH_KHONG_HOP_LE);
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
    return path.posix.join(layThuMuc(loai), nam, thang, ngay, `${crypto.randomUUID()}${layPhanMoRong(tenTep)}`);
}

function chuanHoaKetQuaLuu(ketQua = {}) {
    return {
        ...ketQua,
        driver: env.storage.driver,
        bucket: env.storage.driver === 'minio' ? env.storage.minio.bucket : null,
        etag: ketQua.etag || null
    };
}

async function thucThiStorage(callback, maLoi, thongBao) {
    try {
        return await callback();
    } catch (error) {
        if (laLoiUngDung(error)) { throw error; }
        throw loiDichVuKhongKhaDung(thongBao, maLoi, error);
    }
}

async function damBaoSanSang() {
    return thucThiStorage(() => layStorage().damBaoSanSang(), MA_LOI.STORAGE_KHONG_KHA_DUNG, 'Storage hiện không khả dụng.');
}

async function kiemTraKetNoi() {
    return thucThiStorage(async () => {
        const ketQua = await layStorage().kiemTraKetNoi();
        if (!ketQua?.ready) { throw new Error('Storage chưa sẵn sàng.'); }
        return ketQua;
    }, MA_LOI.STORAGE_KHONG_KHA_DUNG, 'Storage hiện không khả dụng.');
}

async function luuTuBuffer(khoa, buffer, options = {}) {
    if (!Buffer.isBuffer(buffer)) { throw new TypeError('Dữ liệu lưu trữ phải là Buffer.'); }
    const ketQua = await thucThiStorage(() => layStorage().luuTuBuffer(khoa, buffer, options), MA_LOI.STORAGE_GHI_THAT_BAI, 'Không thể ghi dữ liệu vào storage.');
    return chuanHoaKetQuaLuu(ketQua);
}

async function luuTuTep(khoa, duongDanNguon, options = {}) {
    if (typeof duongDanNguon !== 'string' || !duongDanNguon.trim()) { throw new TypeError('Đường dẫn tệp nguồn không hợp lệ.'); }
    const ketQua = await thucThiStorage(() => layStorage().luuTuTep(khoa, duongDanNguon, options), MA_LOI.STORAGE_GHI_THAT_BAI, 'Không thể ghi tệp vào storage.');
    return chuanHoaKetQuaLuu(ketQua);
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
    throw loiHeThong('Tệp upload không có path hoặc buffer.', MA_LOI.TEP_KHONG_HOP_LE);
}

async function taoReadStream(khoa) {
    return thucThiStorage(() => layStorage().taoReadStream(khoa), MA_LOI.STORAGE_DOC_THAT_BAI, 'Không thể đọc tệp từ storage.');
}

async function docBuffer(khoa) {
    return thucThiStorage(() => layStorage().docBuffer(khoa), MA_LOI.STORAGE_DOC_THAT_BAI, 'Không thể đọc tệp từ storage.');
}

async function tonTai(khoa) {
    return thucThiStorage(() => layStorage().tonTai(khoa), MA_LOI.STORAGE_KHONG_KHA_DUNG, 'Không thể kiểm tra tệp trên storage.');
}

async function layThongTin(khoa) {
    return thucThiStorage(() => layStorage().layThongTin(khoa), MA_LOI.STORAGE_KHONG_KHA_DUNG, 'Không thể đọc thông tin tệp trên storage.');
}

async function xoa(khoa) {
    return thucThiStorage(() => layStorage().xoa(khoa), MA_LOI.STORAGE_XOA_THAT_BAI, 'Không thể xóa tệp khỏi storage.');
}

async function diChuyen(khoaNguon, khoaDich) {
    return thucThiStorage(() => layStorage().diChuyen(khoaNguon, khoaDich), MA_LOI.STORAGE_SAO_CHEP_THAT_BAI, 'Không thể di chuyển tệp trên storage.');
}

async function taoUrlTamThoi(khoa, expiresSeconds = env.storage.signedUrlExpiresSeconds) {
    return thucThiStorage(() => layStorage().taoUrlTamThoi(khoa, expiresSeconds), MA_LOI.STORAGE_KHONG_KHA_DUNG, 'Không thể tạo URL tạm thời.');
}

module.exports = {
    LOAI_THU_MUC,
    layStorage,
    taoKhoaLuuTru,
    damBaoSanSang,
    kiemTraKetNoi,
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