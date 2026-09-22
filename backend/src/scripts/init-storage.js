'use strict';

const Minio = require('minio');
const env = require('../config/env');

const SO_LAN_THU = 60;
const CHO_MS = 2000;

function cho(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function taoMinioClient() {
    const config = env.storage.minio;
    return new Minio.Client({
        endPoint: config.endpoint,
        port: config.port,
        useSSL: config.useSSL,
        accessKey: config.accessKey,
        secretKey: config.secretKey,
        region: config.region
    });
}

async function damBaoBucket() {
    if (env.storage.driver !== 'minio') {
        console.log('[StorageInit] STORAGE_DRIVER không phải minio, bỏ qua.');
        return;
    }
    const client = taoMinioClient();
    const bucket = env.storage.minio.bucket;
    let loiCuoi = null;
    for (let lanThu = 1; lanThu <= SO_LAN_THU; lanThu += 1) {
        try {
            const tonTai = await client.bucketExists(bucket);
            if (!tonTai) {
                console.log(`[StorageInit] Tạo bucket "${bucket}"...`);
                await client.makeBucket(bucket, env.storage.minio.region);
            }
            const daTonTai = await client.bucketExists(bucket);
            if (!daTonTai) { throw new Error(`Bucket "${bucket}" chưa sẵn sàng sau khi tạo.`); }
            console.log(`[StorageInit] Bucket "${bucket}" đã sẵn sàng.`);
            return;
        } catch (error) {
            loiCuoi = error;
            console.log(`[StorageInit] MinIO chưa sẵn sàng ${lanThu}/${SO_LAN_THU}: ${error.message}`);
            if (lanThu < SO_LAN_THU) { await cho(CHO_MS); }
        }
    }
    throw loiCuoi || new Error('Không thể khởi tạo MinIO.');
}

void damBaoBucket().catch((error) => {
    console.error('[StorageInit] Thất bại:', error);
    process.exitCode = 1;
});