'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {
    sharp,
    taoAgent,
    khoiDongRuntimeTest,
    dongRuntimeTest,
    taoAnhBuffer,
    uploadBuffer,
    layThongTinUpload,
    taiXuongBuffer,
    choCongViecKetThuc,
    datGioiHanChinhSach,
    batWorkerHinhAnh
} = require('../helpers/runtime-test.helper');

let agent;

async function taoConversion({ formatNguon, tenNguon, mimeType, loaiChuyenDoi = 'CHUYEN_DINH_DANG', dinhDangDich = null, tuyChon = {}, width = 320, height = 180, buffer = null }) {
    const input = buffer || await taoAnhBuffer(formatNguon, width, height);
    const uploadResponse = await uploadBuffer(agent, input, tenNguon, mimeType);
    assert.equal(uploadResponse.statusCode, 201);
    const upload = layThongTinUpload(uploadResponse);
    assert.ok(upload.tepId);
    assert.ok(upload.phienBanId);
    const body = {
        tepNguonId: upload.tepId,
        phienBanNguonId: upload.phienBanId,
        loaiChuyenDoi,
        tuyChon
    };
    if (dinhDangDich) { body.dinhDangDich = dinhDangDich; }
    const createResponse = await agent.post('/api/v1/chuyen-doi')
        .set('Idempotency-Key', `e2e-${crypto.randomUUID()}`)
        .send(body);
    assert.equal(createResponse.statusCode, 201);
    const congViecId = createResponse.body.data?.congViec?.id;
    assert.ok(congViecId);
    const statusResponse = await choCongViecKetThuc(agent, congViecId);
    assert.equal(statusResponse.statusCode, 200);
    assert.equal(statusResponse.body.data?.congViec?.trangThai, 'HOAN_THANH');
    assert.equal(statusResponse.body.data?.congViec?.tienTrinh, 100);
    const tepKetQuaId = statusResponse.body.data?.congViec?.tepKetQuaId;
    assert.ok(tepKetQuaId);
    const downloadResponse = await taiXuongBuffer(agent, tepKetQuaId);
    assert.equal(downloadResponse.statusCode, 200);
    assert.ok(Buffer.isBuffer(downloadResponse.body));
    return {
        upload,
        congViecId,
        status: statusResponse.body.data,
        output: downloadResponse.body,
        metadata: await sharp(downloadResponse.body).metadata()
    };
}

test.before(async () => {
    await khoiDongRuntimeTest();
    await datGioiHanChinhSach('UPLOAD_KHACH_MAC_DINH', 100);
    await datGioiHanChinhSach('UPLOAD_KHACH_SO_TEP_MOI_LAN', 20);
    await datGioiHanChinhSach('UPLOAD_KHACH_KICH_THUOC_MOI_TEP', 10 * 1024 * 1024);
    agent = taoAgent();
    await batWorkerHinhAnh();
});

test.after(async () => { await dongRuntimeTest(); });

test('PNG → WebP', async () => {
    const result = await taoConversion({
        formatNguon: 'png',
        tenNguon: 'png-webp.png',
        mimeType: 'image/png',
        dinhDangDich: 'webp'
    });
    assert.equal(result.metadata.format, 'webp');
    assert.equal(result.metadata.width, 320);
    assert.equal(result.metadata.height, 180);
});

test('JPEG → PNG', async () => {
    const result = await taoConversion({
        formatNguon: 'jpeg',
        tenNguon: 'jpeg-png.jpg',
        mimeType: 'image/jpeg',
        dinhDangDich: 'png'
    });
    assert.equal(result.metadata.format, 'png');
    assert.equal(result.metadata.width, 320);
    assert.equal(result.metadata.height, 180);
});

test('WebP → JPEG', async () => {
    const result = await taoConversion({
        formatNguon: 'webp',
        tenNguon: 'webp-jpeg.webp',
        mimeType: 'image/webp',
        dinhDangDich: 'jpeg'
    });
    assert.equal(result.metadata.format, 'jpeg');
    assert.equal(result.metadata.width, 320);
    assert.equal(result.metadata.height, 180);
});

test('Resize PNG 320x180 → 160x90', async () => {
    const result = await taoConversion({
        formatNguon: 'png',
        tenNguon: 'resize.png',
        mimeType: 'image/png',
        loaiChuyenDoi: 'DOI_KICH_THUOC',
        tuyChon: {
            width: 160,
            height: 90
        }
    });
    assert.equal(result.metadata.format, 'png');
    assert.equal(result.metadata.width, 160);
    assert.equal(result.metadata.height, 90);
});

test('Crop PNG 320x180 → 100x80', async () => {
    const result = await taoConversion({
        formatNguon: 'png',
        tenNguon: 'crop.png',
        mimeType: 'image/png',
        loaiChuyenDoi: 'CAT',
        tuyChon: {
            x: 10,
            y: 20,
            width: 100,
            height: 80
        }
    });
    assert.equal(result.metadata.format, 'png');
    assert.equal(result.metadata.width, 100);
    assert.equal(result.metadata.height, 80);
});

test('Rotate PNG 320x180 90 độ → 180x320', async () => {
    const result = await taoConversion({
        formatNguon: 'png',
        tenNguon: 'rotate.png',
        mimeType: 'image/png',
        loaiChuyenDoi: 'XOAY',
        tuyChon: {
            angle: 90
        }
    });
    assert.equal(result.metadata.format, 'png');
    assert.equal(result.metadata.width, 180);
    assert.equal(result.metadata.height, 320);
});

test('Optimize WebP vẫn giữ đúng định dạng và kích thước', async () => {
    const result = await taoConversion({
        formatNguon: 'webp',
        tenNguon: 'optimize.webp',
        mimeType: 'image/webp',
        loaiChuyenDoi: 'TOI_UU_HINH_ANH',
        tuyChon: {
            quality: 60
        }
    });
    assert.equal(result.metadata.format, 'webp');
    assert.equal(result.metadata.width, 320);
    assert.equal(result.metadata.height, 180);
});

test('Signature thật thắng extension giả', async () => {
    const jpeg = await taoAnhBuffer('jpeg', 120, 90);
    const result = await taoConversion({
        formatNguon: 'jpeg',
        tenNguon: 'gia-png.png',
        mimeType: 'image/png',
        dinhDangDich: 'webp',
        width: 120,
        height: 90,
        buffer: jpeg
    });
    assert.equal(result.metadata.format, 'webp');
    assert.equal(result.metadata.width, 120);
    assert.equal(result.metadata.height, 90);
    assert.equal(result.status.congViec.dinhDangNguon, 'jpeg');
});

test('Full flow tạo đủ history conversion', async () => {
    const result = await taoConversion({
        formatNguon: 'png',
        tenNguon: 'history.png',
        mimeType: 'image/png',
        dinhDangDich: 'webp'
    });
    const response = await agent.get(`/api/v1/lich-su/cua-toi?congViecId=${result.congViecId}&gioiHan=100`);
    assert.equal(response.statusCode, 200);
    const events = response.body.data.danhSach.map((item) => item.loaiSuKien);
    assert.ok(events.includes('CHUYEN_DOI_DA_TAO'));
    assert.ok(events.includes('CHUYEN_DOI_BAT_DAU'));
    assert.ok(events.includes('TEP_KET_QUA_DA_TAO'));
    assert.ok(events.includes('CHUYEN_DOI_HOAN_THANH'));
});