'use strict';

const fs = require('node:fs');
const { Client } = require('minio');
const StorageInterface = require('./storage.interface');

function chuanHoaKhoa(khoa) {
    if (typeof khoa !== 'string' || !khoa.trim()) {
        throw new TypeError('Khóa lưu trữ không hợp lệ.');
    }
    const ketQua = khoa.trim().replaceAll('\\', '/').replace(/^\/+/, '');
    if (!ketQua || ketQua.includes('../') || ketQua === '..') {
        throw new TypeError('Khóa lưu trữ không hợp lệ.');
    }
    return ketQua;
}

class MinioStorage extends StorageInterface {
    constructor(config = {}) {
        super(config);
        if (!config.endpoint) { throw new Error('Thiếu MINIO_ENDPOINT.'); }
        if (!config.bucket) { throw new Error('Thiếu MINIO_BUCKET.'); }
        this.bucket = config.bucket;
        this.region = config.region || 'us-east-1';
        this.prefix = String(config.prefix || '').replace(/^\/+|\/+$/g, '');
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

    async damBaoSanSang() {
        const tonTai = await this.client.bucketExists(this.bucket);
        if (!tonTai) { await this.client.makeBucket(this.bucket, this.region); }
        return true;
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
        await this.client.putObject(
            this.bucket,
            objectName,
            buffer,
            buffer.length,
            this.taoMetadata(options)
        );
        return {
            khoa: chuanHoaKhoa(khoa),
            objectName,
            kichThuoc: buffer.length
        };
    }

    async luuTuTep(khoa, duongDanNguon, options = {}) {
        if (typeof duongDanNguon !== 'string' || !duongDanNguon.trim()) {
            throw new TypeError('Đường dẫn tệp nguồn không hợp lệ.');
        }
        await fs.promises.access(duongDanNguon, fs.constants.R_OK);
        await this.damBaoSanSang();
        const objectName = this.layKhoa(khoa);
        await this.client.fPutObject(
            this.bucket,
            objectName,
            duongDanNguon,
            this.taoMetadata(options)
        );
        const thongTin = await fs.promises.stat(duongDanNguon);
        return {
            khoa: chuanHoaKhoa(khoa),
            objectName,
            kichThuoc: thongTin.size
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
        try {
            await this.client.statObject(this.bucket, this.layKhoa(khoa));
            return true;
        } catch (error) {
            if (
                error.code === 'NotFound' ||
                error.code === 'NoSuchKey' ||
                error.code === 'NoSuchObject'
            ) {
                return false;
            }
            throw error;
        }
    }

    async layThongTin(khoa) {
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
            if (
                error.code === 'NotFound' ||
                error.code === 'NoSuchKey' ||
                error.code === 'NoSuchObject'
            ) {
                return null;
            }
            throw error;
        }
    }

    async xoa(khoa) {
        await this.client.removeObject(this.bucket, this.layKhoa(khoa));
        return true;
    }

    async diChuyen(khoaNguon, khoaDich) {
        const objectNguon = this.layKhoa(khoaNguon);
        const objectDich = this.layKhoa(khoaDich);
        await this.client.copyObject(
            this.bucket,
            objectDich,
            `/${this.bucket}/${objectNguon}`
        );
        await this.client.removeObject(this.bucket, objectNguon);
        return {
            khoa: chuanHoaKhoa(khoaDich),
            objectName: objectDich
        };
    }

    async taoUrlTamThoi(khoa, expiresSeconds = 900) {
        if (!Number.isSafeInteger(expiresSeconds) || expiresSeconds <= 0) {
            throw new TypeError('Thời gian hết hạn URL không hợp lệ.');
        }
        return this.client.presignedGetObject(
            this.bucket,
            this.layKhoa(khoa),
            expiresSeconds
        );
    }

}

module.exports = MinioStorage;