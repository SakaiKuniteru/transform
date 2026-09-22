'use strict';

const { apDungMoiTruongTest } = require('../helpers/test-env');
apDungMoiTruongTest();

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const sharp = require('sharp');
const { LOAI_CHUYEN_DOI } = require('../../src/constants/loai-chuyen-doi');
const { DINH_DANG } = require('../../src/constants/dinh-dang-tep');
const { TEN_QUEUE } = require('../../src/config/queue');
const {
    taoAgent,
    khoiDongRuntimeTest,
    dongRuntimeTest,
    uploadBuffer,
    layThongTinUpload,
    taiXuongBuffer,
    choCongViecKetThuc,
    datGioiHanChinhSach
} = require('../helpers/runtime-test.helper');
const workerRuntime = require('../../src/workers/worker');

let agent;

async function taoAnhChu() {
    const mau = {
        T: ['11111','00100','00100','00100','00100','00100','00100'],
        E: ['11111','10000','10000','11110','10000','10000','11111'],
        S: ['01111','10000','10000','01110','00001','00001','11110']
    };
    const cell = 28;
    const gap = 28;
    const margin = 60;
    let x = margin;
    let rects = '';
    for (const kyTu of 'TEST') {
        const pattern = mau[kyTu];
        for (let row = 0; row < 7; row += 1) {
            for (let col = 0; col < 5; col += 1) {
                if (pattern[row][col] === '1') { rects += `<rect x="${x + col * cell}" y="${margin + row * cell}" width="${cell}" height="${cell}" fill="black"/>`; }
            }
        }
        x += 5 * cell + gap;
    }
    const width = x - gap + margin;
    const height = 7 * cell + margin * 2;
    const svg = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="white"/>${rects}</svg>`, 'utf8');
    return sharp(svg).png().toBuffer();
}

test.before(async () => {
    await khoiDongRuntimeTest();
    await datGioiHanChinhSach('UPLOAD_KHACH_MAC_DINH', 20);
    await datGioiHanChinhSach('UPLOAD_KHACH_SO_TEP_MOI_LAN', 20);
    await datGioiHanChinhSach('UPLOAD_KHACH_KICH_THUOC_MOI_TEP', 10 * 1024 * 1024);
    agent = taoAgent();
    await workerRuntime.batWorkerTheoQueue(TEN_QUEUE.OCR);
});

test.after(async () => { await dongRuntimeTest(); });

test('OCR PNG → TXT full flow bằng Tesseract', async () => {
    const png = await taoAnhChu();
    const uploadResponse = await uploadBuffer(agent, png, 'ocr-test.png', 'image/png');
    assert.equal(uploadResponse.statusCode, 201);
    const nguon = layThongTinUpload(uploadResponse);
    const createResponse = await agent.post('/api/v1/chuyen-doi')
        .set('Idempotency-Key', `ocr-${crypto.randomUUID()}`)
        .send({
            tepNguonId: nguon.tepId,
            phienBanNguonId: nguon.phienBanId,
            loaiChuyenDoi: LOAI_CHUYEN_DOI.OCR,
            tuyChon: { ngonNgu: 'eng', psm: 6 }
        });
    assert.equal(createResponse.statusCode, 201);
    assert.equal(createResponse.body.data?.queue?.queueName, TEN_QUEUE.OCR);
    assert.equal(createResponse.body.data?.congViec?.dinhDangDich, DINH_DANG.TXT);
    const congViecId = createResponse.body.data?.congViec?.id;
    const statusResponse = await choCongViecKetThuc(agent, congViecId, { timeoutMs: 30000, intervalMs: 150 });
    assert.equal(statusResponse.statusCode, 200);
    assert.equal(statusResponse.body.data?.congViec?.trangThai, 'HOAN_THANH');
    const tepKetQuaId = statusResponse.body.data?.congViec?.tepKetQuaId;
    const downloadResponse = await taiXuongBuffer(agent, tepKetQuaId);
    assert.equal(downloadResponse.statusCode, 200);
    assert.match(downloadResponse.body.toString('utf8').toUpperCase(), /TEST/);
});