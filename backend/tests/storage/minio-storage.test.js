'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { apDungMoiTruongTest } = require('../helpers/test-env');

apDungMoiTruongTest({ storageDriver: 'minio' });

const storage = require('../../src/infrastructure/storage/storage.service');

test('MinIO readiness/write/read/stat/exists/move/presigned/delete', async () => {
    await storage.damBaoSanSang();
    const ketNoi = await storage.kiemTraKetNoi();
    assert.equal(ketNoi.driver, 'minio');
    assert.equal(ketNoi.ready, true);
    const id = crypto.randomUUID();
    const khoaNguon = `original/test/${id}.txt`;
    const khoaDich = `output/test/${id}.txt`;
    const buffer = Buffer.from('TRANSFORM_MINIO_STORAGE');
    try {
        const saved = await storage.luuTuBuffer(khoaNguon, buffer, { contentType: 'text/plain' });
        assert.equal(saved.driver, 'minio');
        assert.equal(saved.bucket, process.env.MINIO_BUCKET);
        assert.equal(await storage.tonTai(khoaNguon), true);
        const stat = await storage.layThongTin(khoaNguon);
        assert.equal(stat.kichThuoc, buffer.length);
        const read = await storage.docBuffer(khoaNguon);
        assert.deepEqual(read, buffer);
        const stream = await storage.taoReadStream(khoaNguon);
        const chunks = [];
        for await (const chunk of stream) { chunks.push(Buffer.from(chunk)); }
        assert.deepEqual(Buffer.concat(chunks), buffer);
        await storage.diChuyen(khoaNguon, khoaDich);
        assert.equal(await storage.tonTai(khoaNguon), false);
        assert.equal(await storage.tonTai(khoaDich), true);
        const url = await storage.taoUrlTamThoi(khoaDich, 60);
        assert.match(url, /^https?:\/\//);
    } finally {
        await storage.xoa(khoaNguon).catch(() => {});
        await storage.xoa(khoaDich).catch(() => {});
    }
});