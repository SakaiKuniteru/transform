'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { LOAI_CHUYEN_DOI } = require('../../src/constants/loai-chuyen-doi');
const { DINH_DANG } = require('../../src/constants/dinh-dang-tep');
const { TEN_QUEUE } = require('../../src/config/queue');
const {
    taoAgent,
    taoRequest,
    khoiDongRuntimeTest,
    dongRuntimeTest,
    taoAnhBuffer,
    uploadBuffer,
    layThongTinUpload
} = require('../helpers/runtime-test.helper');

let agent;
let tepNguonId;
let phienBanNguonId;

async function taoYeuCau(body = {}) {
    return agent.post('/api/v1/chuyen-doi').set('Idempotency-Key', `integration-${crypto.randomUUID()}`).send({ tepNguonId, phienBanNguonId, tuyChon: {}, ...body });
}

test.before(async () => {
    await khoiDongRuntimeTest();
    agent = taoAgent();
    const buffer = await taoAnhBuffer('png', 64, 64);
    const response = await uploadBuffer(agent, buffer, 'chuyen-doi-integration.png', 'image/png');
    assert.equal(response.statusCode, 201);
    const upload = layThongTinUpload(response);
    tepNguonId = upload.tepId;
    phienBanNguonId = upload.phienBanId;
    assert.ok(tepNguonId);
    assert.ok(phienBanNguonId);
});

test.after(async () => { await dongRuntimeTest(); });

test('API chuyển đổi báo hỗ trợ PNG sang WebP bằng Sharp', async () => {
    const response = await taoRequest().get('/api/v1/chuyen-doi/ho-tro').query({ loaiChuyenDoi: LOAI_CHUYEN_DOI.CHUYEN_DINH_DANG, dinhDangNguon: DINH_DANG.PNG, dinhDangDich: DINH_DANG.WEBP });
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.ok(response.body.data.some((item) => item.key === 'sharp:chuyen-dinh-dang-hinh-anh'));
});

test('API chuyển đổi báo hỗ trợ JSON sang YAML bằng JSON converter', async () => {
    const response = await taoRequest().get('/api/v1/chuyen-doi/ho-tro').query({ loaiChuyenDoi: LOAI_CHUYEN_DOI.CHUYEN_DINH_DANG, dinhDangNguon: DINH_DANG.JSON, dinhDangDich: DINH_DANG.YAML });
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.ok(response.body.data.some((item) => item.key === 'json:chuyen-dinh-dang'));
});

test('API public từ chối 3 loại chuyển đổi chưa hỗ trợ', async () => {
    const danhSach = [LOAI_CHUYEN_DOI.GOP, LOAI_CHUYEN_DOI.SO_SANH, LOAI_CHUYEN_DOI.NHAN_DIEN_NGON_NGU];
    for (const loaiChuyenDoi of danhSach) {
        const response = await taoRequest().get('/api/v1/chuyen-doi/ho-tro').query({ loaiChuyenDoi });
        assert.equal(response.statusCode, 400, loaiChuyenDoi);
        assert.equal(response.body.success, false, loaiChuyenDoi);
    }
});

test('OCR PNG không truyền định dạng đích mặc định thành TXT', async () => {
    const response = await taoYeuCau({ loaiChuyenDoi: LOAI_CHUYEN_DOI.OCR, tuyChon: { ngonNgu: 'eng' } });
    assert.equal(response.statusCode, 201);
    assert.equal(response.body.data?.queue?.queueName, TEN_QUEUE.OCR);
    assert.equal(response.body.data?.congViec?.dinhDangNguon, DINH_DANG.PNG);
    assert.equal(response.body.data?.congViec?.dinhDangDich, DINH_DANG.TXT);
});

test('MA_HOA không truyền định dạng đích mặc định thành BASE64', async () => {
    const response = await taoYeuCau({ loaiChuyenDoi: LOAI_CHUYEN_DOI.MA_HOA });
    assert.equal(response.statusCode, 201);
    assert.equal(response.body.data?.queue?.queueName, TEN_QUEUE.DU_LIEU);
    assert.equal(response.body.data?.congViec?.dinhDangNguon, DINH_DANG.PNG);
    assert.equal(response.body.data?.congViec?.dinhDangDich, DINH_DANG.BASE64);
});

test('NEN không truyền định dạng đích mặc định thành GZIP', async () => {
    const response = await taoYeuCau({ loaiChuyenDoi: LOAI_CHUYEN_DOI.NEN });
    assert.equal(response.statusCode, 201);
    assert.equal(response.body.data?.queue?.queueName, TEN_QUEUE.NEN);
    assert.equal(response.body.data?.congViec?.dinhDangNguon, DINH_DANG.PNG);
    assert.equal(response.body.data?.congViec?.dinhDangDich, DINH_DANG.GZIP);
});

test('DOI_KICH_THUOC không truyền định dạng đích giữ định dạng nguồn', async () => {
    const response = await taoYeuCau({ loaiChuyenDoi: LOAI_CHUYEN_DOI.DOI_KICH_THUOC, tuyChon: { width: 32, height: 32 } });
    assert.equal(response.statusCode, 201);
    assert.equal(response.body.data?.queue?.queueName, TEN_QUEUE.HINH_ANH);
    assert.equal(response.body.data?.congViec?.dinhDangNguon, DINH_DANG.PNG);
    assert.equal(response.body.data?.congViec?.dinhDangDich, DINH_DANG.PNG);
});

test('Các loại bắt buộc target bị từ chối khi thiếu dinhDangDich', async () => {
    const danhSach = [LOAI_CHUYEN_DOI.CHUYEN_DINH_DANG, LOAI_CHUYEN_DOI.GIAI_MA, LOAI_CHUYEN_DOI.GIAI_NEN, LOAI_CHUYEN_DOI.TRICH_XUAT];
    for (const loaiChuyenDoi of danhSach) {
        const response = await taoYeuCau({ loaiChuyenDoi });
        assert.equal(response.statusCode, 400, loaiChuyenDoi);
        assert.equal(response.body.success, false, loaiChuyenDoi);
    }
});