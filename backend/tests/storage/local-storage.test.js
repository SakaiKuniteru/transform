'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { apDungMoiTruongTest } = require('../helpers/test-env');

apDungMoiTruongTest({ storageDriver: 'local' });

const env = require('../../src/config/env');
const storage = require('../../src/infrastructure/storage/storage.service');

function layRoot() {
    if (path.isAbsolute(env.storage.root)) { return env.storage.root; }
    return path.resolve(env.backendRoot, env.storage.root);
}

test.before(async () => {
    await fs.promises.rm(layRoot(), { recursive: true, force: true });
    await storage.damBaoSanSang();
});

test.after(async () => { await fs.promises.rm(layRoot(), { recursive: true, force: true }); });

test('Local Storage write/read/stat/exists/move/delete', async () => {
    const khoaNguon = 'original/test/local.txt';
    const khoaDich = 'output/test/local-moved.txt';
    const buffer = Buffer.from('TRANSFORM_LOCAL_STORAGE');
    const saved = await storage.luuTuBuffer(khoaNguon, buffer, { contentType: 'text/plain' });
    assert.equal(saved.driver, 'local');
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
    await storage.xoa(khoaDich);
    assert.equal(await storage.tonTai(khoaDich), false);
});