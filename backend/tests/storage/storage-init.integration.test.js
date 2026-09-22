'use strict';

process.env.TEST_STORAGE_DRIVER = 'minio';
process.env.TEST_MINIO_BUCKET = 'transform-init-test';

const test = require('node:test');
const assert = require('node:assert/strict');
const { apDungMoiTruongTest } = require('../helpers/test-env');

apDungMoiTruongTest({ storageDriver: 'minio' });

const env = require('../../src/config/env');
const { taoMinioClient, damBaoBucket } = require('../../src/scripts/init-storage');

test('storage:init tạo bucket khi chưa có và chạy lại không lỗi', async () => {
    const client = taoMinioClient();
    const bucket = env.storage.minio.bucket;
    if (await client.bucketExists(bucket)) { await client.removeBucket(bucket); }
    try {
        assert.equal(await client.bucketExists(bucket), false);
        await damBaoBucket();
        assert.equal(await client.bucketExists(bucket), true);
        await damBaoBucket();
        assert.equal(await client.bucketExists(bucket), true);
    } finally {
        if (await client.bucketExists(bucket)) { await client.removeBucket(bucket); }
    }
});