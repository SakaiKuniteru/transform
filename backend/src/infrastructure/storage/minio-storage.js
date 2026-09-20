'use strict';

const fs = require('node:fs');
const { Client } = require('minio');
const StorageInterface = require('./storage.interface');

function chuanHoaKhoa(khoa) {
    if (typeof khoa !== 'string' || !khoa.trim()) { throw new TypeError('Khóa lưu trữ không hợp lệ.'); }
    const ketQua = khoa.trim().replaceAll('\\', '/').replace(/^\/+/, '');
    if (!ketQua || ketQua.includes('../') || ketQua === '..') { throw new TypeError('Khóa lưu trữ không hợp lệ.'); }
    return ketQua;
}

function laKhongTimThay(error) {
    return ['NotFound', 'NoSuchKey', 'NoSuchObject'].includes(error?.code);
}

class MinioStorage extends StorageInterface {
    constructor(config = {}) {
        super(config);
        if (!config.endpoint) { throw new Error('Thiếu MINIO_ENDPOINT.'); }
        if (!config.bucket) { throw new Error('Thiếu MINIO_BUCKET.'); }
        this.bucket = config.bucket;
        this.region = config.region || 'us-east-1';
        this.prefix = String(config.prefix || '').replace(/^\/+|\/+$/g, '');
        this.autoCreateBucket = config.autoCreateBucket === true;
        this.daSanSang = false;
        this.dangDamBaoSanSang = null;
        this.client = new Client({
            endPoint: config.endpoint,
            port: Number(config.port || 9000),
            useSSL: Boolean(config.useSSL),
            accessKey: config.accessKey || '',
            secretKey: config.secretKey || ''
        });
    }

    layKhoa(khoa) {
        const khoaHopLe = chuanHoaKhoa(khoa);
        return this.prefix ? `${this.prefix}/${khoaHopLe}` : khoaHopLe;
    }

    async kiemTraKetNoi() {
        const tonTai = await this.client.bucketExists(this.bucket);
        return {
            driver: 'minio',
            ready: tonTai,
            bucket: this.bucket,
            region: this.region
        };
    }

    async damBaoSanSang() {
        if (this.daSanSang) { return true; }
        if (this.dangDamBaoSanSang) { return this.dangDamBaoSanSang; }
        this.dangDamBaoSanSang = (async () => {
            const tonTai = await this.client.bucketExists(this.bucket);
            if (!tonTai) {
                if (!this.autoCreateBucket) { throw new Error(`MinIO bucket "${this.bucket}" không tồn tại.`); }
                await this.client.makeBucket(this.bucket, this.region);
            }
            this.daSanSang = true;
            return true;
        })();
        try {
            return await this.dangDamBaoSanSang;
        } finally { this.dangDamBaoSanSang = null; }
    }

    taoMetadata(options = {}) {
        const metadata = { ...(options.metadata || {}) };
        if (options.contentType) { metadata['Content-Type'] = options.contentType; }
        return metadata;
    }

    async luuTuBuffer(khoa, buffer, options = {}) {
        if (!Buffer.isBuffer(buffer)) { throw new TypeError('Dữ liệu lưu trữ phải là Buffer.'); }
        await this.damBaoSanSang();
        const objectName = this.layKhoa(khoa);
        const ketQua = await this.client.putObject(this.bucket, objectName, buffer, buffer.length, this.taoMetadata(options));
        return {
            khoa: chuanHoaKhoa(khoa),
            objectName,
            kichThuoc: buffer.length,
            etag: ketQua?.etag || null,
            versionId: ketQua?.versionId || null
        };
    }

    async luuTuTep(khoa, duongDanNguon, options = {}) {
        if (typeof duongDanNguon !== 'string' || !duongDanNguon.trim()) { throw new TypeError('Đường dẫn tệp nguồn không hợp lệ.'); }
        await fs.promises.access(duongDanNguon, fs.constants.R_OK);
        await this.damBaoSanSang();
        const objectName = this.layKhoa(khoa);
        const ketQua = await this.client.fPutObject(this.bucket, objectName, duongDanNguon, this.taoMetadata(options));
        const thongTin = await fs.promises.stat(duongDanNguon);
        return {
            khoa: chuanHoaKhoa(khoa),
            objectName,
            kichThuoc: thongTin.size,
            etag: ketQua?.etag || null,
            versionId: ketQua?.versionId || null
        };
    }

    async taoReadStream(khoa) {
        await this.damBaoSanSang();
        return this.client.getObject(this.bucket, this.layKhoa(khoa));
    }

    async docBuffer(khoa) {
        const stream = await this.taoReadStream(khoa);
        const chunks = [];
        for await (const chunk of stream) { chunks.push(Buffer.from(chunk)); }
        return Buffer.concat(chunks);
    }

    async tonTai(khoa) {
        await this.damBaoSanSang();
        try {
            await this.client.statObject(this.bucket, this.layKhoa(khoa));
            return true;
        } catch (error) {
            if (laKhongTimThay(error)) { return false; }
            throw error;
        }
    }

    async layThongTin(khoa) {
        await this.damBaoSanSang();
        try {
            const thongTin = await this.client.statObject(this.bucket, this.layKhoa(khoa));
            return {
                khoa: chuanHoaKhoa(khoa),
                kichThuoc: thongTin.size,
                etag: thongTin.etag || null,
                updatedAt: thongTin.lastModified || null,
                metadata: thongTin.metaData || {}
            };
        } catch (error) {
            if (laKhongTimThay(error)) { return null; }
            throw error;
        }
    }

    async xoa(khoa) {
        await this.damBaoSanSang();
        await this.client.removeObject(this.bucket, this.layKhoa(khoa));
        return true;
    }

    async diChuyen(khoaNguon, khoaDich) {
        await this.damBaoSanSang();
        const objectNguon = this.layKhoa(khoaNguon);
        const objectDich = this.layKhoa(khoaDich);
        const ketQua = await this.client.copyObject(this.bucket, objectDich, `/${this.bucket}/${objectNguon}`);
        await this.client.removeObject(this.bucket, objectNguon);
        return {
            khoa: chuanHoaKhoa(khoaDich),
            objectName: objectDich,
            etag: ketQua?.etag || null,
            versionId: ketQua?.versionId || null
        };
    }

    async taoUrlTamThoi(khoa, expiresSeconds = 900) {
        if (!Number.isSafeInteger(expiresSeconds) || expiresSeconds <= 0) { throw new TypeError('Thời gian hết hạn URL không hợp lệ.'); }
        await this.damBaoSanSang();
        return this.client.presignedGetObject(this.bucket, this.layKhoa(khoa), expiresSeconds);
    }
}

module.exports = MinioStorage;