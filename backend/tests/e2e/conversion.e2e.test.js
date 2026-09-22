'use strict';

const { apDungMoiTruongTest } = require('../helpers/test-env');
apDungMoiTruongTest();
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const YAML = require('yaml');
const { LOAI_CHUYEN_DOI } = require('../../src/constants/loai-chuyen-doi');
const { DINH_DANG } = require('../../src/constants/dinh-dang-tep');
const { TEN_QUEUE } = require('../../src/config/queue');
const {
    taoAgent,
    khoiDongRuntimeTest,
    dongRuntimeTest,
    taoAnhBuffer,
    uploadBuffer,
    layThongTinUpload,
    taiXuongBuffer,
    choCongViecKetThuc,
    datGioiHanChinhSach,
    layPool
} = require('../helpers/runtime-test.helper');
const workerRuntime = require('../../src/workers/worker');

let agent;

async function uploadNguon(buffer, tenTep, mimeType) {
    const response = await uploadBuffer(agent, buffer, tenTep, mimeType);
    assert.equal(response.statusCode, 201);
    const upload = layThongTinUpload(response);
    assert.ok(upload.tepId);
    assert.ok(upload.phienBanId);
    return upload;
}

async function taoConversion(nguon, { loaiChuyenDoi, dinhDangDich = null, tuyChon = {}, tenQueue }) {
    const body = { tepNguonId: nguon.tepId, phienBanNguonId: nguon.phienBanId, loaiChuyenDoi, tuyChon };
    if (dinhDangDich) { body.dinhDangDich = dinhDangDich; }
    const response = await agent.post('/api/v1/chuyen-doi').set('Idempotency-Key', `e2e-local-${crypto.randomUUID()}`).send(body);
    assert.equal(response.statusCode, 201);
    if (tenQueue) { assert.equal(response.body.data?.queue?.queueName, tenQueue); }
    const congViecId = response.body.data?.congViec?.id;
    assert.ok(congViecId);
    const statusResponse = await choCongViecKetThuc(agent, congViecId, { timeoutMs: 20000 });
    assert.equal(statusResponse.statusCode, 200);
    assert.equal(statusResponse.body.data?.congViec?.trangThai, 'HOAN_THANH');
    assert.equal(statusResponse.body.data?.congViec?.tienTrinh, 100);
    const tepKetQuaId = statusResponse.body.data?.congViec?.tepKetQuaId;
    assert.ok(tepKetQuaId);
    const downloadResponse = await taiXuongBuffer(agent, tepKetQuaId);
    assert.equal(downloadResponse.statusCode, 200);
    assert.ok(Buffer.isBuffer(downloadResponse.body));
    return { congViecId, status: statusResponse.body.data, output: downloadResponse.body };
}

async function demCongViec() {
    const result = await layPool().query('SELECT COUNT(*)::INTEGER AS tong FROM cong_viec');
    return Number(result.rows[0]?.tong || 0);
}

test.before(async () => {
    await khoiDongRuntimeTest();
    await datGioiHanChinhSach('UPLOAD_KHACH_MAC_DINH', 100);
    await datGioiHanChinhSach('UPLOAD_KHACH_SO_TEP_MOI_LAN', 20);
    await datGioiHanChinhSach('UPLOAD_KHACH_KICH_THUOC_MOI_TEP', 10 * 1024 * 1024);
    agent = taoAgent();
    for (const tenQueue of [TEN_QUEUE.HINH_ANH, TEN_QUEUE.DU_LIEU, TEN_QUEUE.NEN, TEN_QUEUE.CHUYEN_DOI]) { await workerRuntime.batWorkerTheoQueue(tenQueue); }
});

test.after(async () => { await dongRuntimeTest(); });

test('PNG → WebP full flow', async () => {
    const png = await taoAnhBuffer('png', 120, 80);
    const nguon = await uploadNguon(png, 'local-png-webp.png', 'image/png');
    const result = await taoConversion(nguon, { loaiChuyenDoi: LOAI_CHUYEN_DOI.CHUYEN_DINH_DANG, dinhDangDich: DINH_DANG.WEBP, tenQueue: TEN_QUEUE.HINH_ANH });
    const metadata = await require('sharp')(result.output).metadata();
    assert.equal(metadata.format, 'webp');
    assert.equal(metadata.width, 120);
    assert.equal(metadata.height, 80);
});

test('JSON → YAML full flow', async () => {
    const json = Buffer.from(JSON.stringify({ ten: 'Transform', phienBan: 1, active: true }), 'utf8');
    const nguon = await uploadNguon(json, 'local-json-yaml.json', 'application/json');
    const result = await taoConversion(nguon, { loaiChuyenDoi: LOAI_CHUYEN_DOI.CHUYEN_DINH_DANG, dinhDangDich: DINH_DANG.YAML, tenQueue: TEN_QUEUE.DU_LIEU });
    const data = YAML.parse(result.output.toString('utf8'));
    assert.deepEqual(data, { ten: 'Transform', phienBan: 1, active: true });
});

test('PNG → BASE64 full flow', async () => {
    const png = await taoAnhBuffer('png', 64, 64);
    const nguon = await uploadNguon(png, 'local-png-base64.png', 'image/png');
    const result = await taoConversion(nguon, { loaiChuyenDoi: LOAI_CHUYEN_DOI.MA_HOA, tenQueue: TEN_QUEUE.DU_LIEU });
    const decoded = Buffer.from(result.output.toString('ascii').trim(), 'base64');
    assert.deepEqual(decoded, png);
});

test('BASE64 → PNG full flow', async () => {
    const png = await taoAnhBuffer('png', 64, 64);
    const base64 = Buffer.from(png.toString('base64'), 'ascii');
    const nguon = await uploadNguon(base64, 'local-base64-png.base64', 'text/plain');
    const result = await taoConversion(nguon, { loaiChuyenDoi: LOAI_CHUYEN_DOI.GIAI_MA, dinhDangDich: DINH_DANG.PNG, tenQueue: TEN_QUEUE.DU_LIEU });
    assert.deepEqual(result.output, png);
});

test('PNG → GZIP full flow', async () => {
    const png = await taoAnhBuffer('png', 64, 64);
    const nguon = await uploadNguon(png, 'local-png-gzip.png', 'image/png');
    const result = await taoConversion(nguon, { loaiChuyenDoi: LOAI_CHUYEN_DOI.NEN, tenQueue: TEN_QUEUE.NEN });
    assert.deepEqual(zlib.gunzipSync(result.output), png);
});

test('TRICH_XUAT metadata PNG → JSON full flow', async () => {
    const png = await taoAnhBuffer('png', 90, 70);
    const nguon = await uploadNguon(png, 'local-extract.png', 'image/png');
    const result = await taoConversion(nguon, { loaiChuyenDoi: LOAI_CHUYEN_DOI.TRICH_XUAT, dinhDangDich: DINH_DANG.JSON, tuyChon: { kieu: 'METADATA' }, tenQueue: TEN_QUEUE.CHUYEN_DOI });
    const data = JSON.parse(result.output.toString('utf8'));
    assert.equal(data.dinhDang, DINH_DANG.PNG);
    assert.equal(data.chiTiet?.chieuRong, 90);
    assert.equal(data.chiTiet?.chieuCao, 70);
});

test('3 loại chưa hỗ trợ fail trước khi tạo công việc', async () => {
    const png = await taoAnhBuffer('png', 32, 32);
    const nguon = await uploadNguon(png, 'unsupported.png', 'image/png');
    const truoc = await demCongViec();
    for (const loaiChuyenDoi of [
        LOAI_CHUYEN_DOI.GOP,
        LOAI_CHUYEN_DOI.SO_SANH,
        LOAI_CHUYEN_DOI.NHAN_DIEN_NGON_NGU
    ]) {
        const response = await agent.post('/api/v1/chuyen-doi')
            .set('Idempotency-Key', `unsupported-${crypto.randomUUID()}`)
            .send({
                tepNguonId: nguon.tepId,
                phienBanNguonId: nguon.phienBanId,
                loaiChuyenDoi,
                dinhDangDich: DINH_DANG.TXT,
                tuyChon: {}
            });

        assert.equal(response.statusCode, 400, loaiChuyenDoi);
        assert.equal(response.body.success, false, loaiChuyenDoi);
    }
    assert.equal(await demCongViec(), truoc);
});

test('CHUYEN_DINH_DANG thiếu target fail trước khi tạo công việc', async () => {
    const png = await taoAnhBuffer('png', 32, 32);
    const nguon = await uploadNguon(png, 'missing-target.png', 'image/png');
    const truoc = await demCongViec();
    const response = await agent.post('/api/v1/chuyen-doi').set('Idempotency-Key', `missing-target-${crypto.randomUUID()}`).send({ tepNguonId: nguon.tepId, phienBanNguonId: nguon.phienBanId, loaiChuyenDoi: LOAI_CHUYEN_DOI.CHUYEN_DINH_DANG, tuyChon: {} });
    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
    assert.equal(await demCongViec(), truoc);
});

test('invalid file fail trước khi tạo công việc', async () => {
    const buffer = Buffer.from([0, 255, 1, 254, 2, 253, 3, 252, 4, 251]);
    const nguon = await uploadNguon(buffer, 'invalid.bin', 'application/octet-stream');
    const truoc = await demCongViec();
    const response = await agent.post('/api/v1/chuyen-doi').set('Idempotency-Key', `invalid-${crypto.randomUUID()}`).send({ tepNguonId: nguon.tepId, phienBanNguonId: nguon.phienBanId, loaiChuyenDoi: LOAI_CHUYEN_DOI.CHUYEN_DINH_DANG, dinhDangDich: DINH_DANG.PNG, tuyChon: {} });
    assert.equal(response.statusCode, 415);
    assert.equal(response.body.success, false);
    assert.equal(await demCongViec(), truoc);
});