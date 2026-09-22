'use strict';

process.env.QUEUE_BACKOFF_DELAY_MS = '20';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {
    env,
    taoAgent,
    khoiDongRuntimeTest,
    dongRuntimeTest,
    taoAnhBuffer,
    uploadBuffer,
    layThongTinUpload,
    choCongViecKetThuc,
    datGioiHanChinhSach,
    storageService,
    layPool
} = require('../helpers/runtime-test.helper');
const { TEN_QUEUE } = require('../../src/config/queue');
const workerRuntime = require('../../src/workers/worker');
const transformEngine = require('../../src/modules/chuyen-doi/engine/transform-engine.service');
const tepRepository = require('../../src/modules/tep/tep.repository');
const congViecService = require('../../src/modules/cong-viec/cong-viec.service');

let agent;

function layStorageRoot() { return path.isAbsolute(env.storage.root) ? env.storage.root : path.resolve(env.backendRoot, env.storage.root); }

async function demFileDeQuy(duongDan) {
    let entries;
    try { entries = await fs.promises.readdir(duongDan, { withFileTypes: true }); } catch (error) { if (error.code === 'ENOENT') { return 0; } throw error; }
    let tong = 0;
    for (const entry of entries) { tong += entry.isDirectory() ? await demFileDeQuy(path.join(duongDan, entry.name)) : 1; }
    return tong;
}

async function demOutput() { return demFileDeQuy(path.resolve(layStorageRoot(), env.storage.outputDir)); }

async function demTemp() { return demFileDeQuy(path.resolve(layStorageRoot(), env.storage.tempDir)); }

async function uploadPng(tenTep) {
    const buffer = await taoAnhBuffer('png', 80, 60);
    const response = await uploadBuffer(agent, buffer, tenTep, 'image/png');
    assert.equal(response.statusCode, 201);
    const upload = layThongTinUpload(response);
    assert.ok(upload.tepId);
    assert.ok(upload.phienBanId);
    return { ...upload, buffer };
}

async function taoPngWebp(nguon, soLanThuToiDa = 1, converterKey = null) {
    const body = { tepNguonId: nguon.tepId, phienBanNguonId: nguon.phienBanId, loaiChuyenDoi: 'CHUYEN_DINH_DANG', dinhDangDich: 'webp', soLanThuToiDa, tuyChon: {} };
    if (converterKey) { body.converterKey = converterKey; }
    const response = await agent.post('/api/v1/chuyen-doi').set('Idempotency-Key', `lifecycle-${crypto.randomUUID()}`).send(body);
    assert.equal(response.statusCode, 201);
    return response.body.data;
}

async function demKetQua(congViecId) {
    const result = await layPool().query(`SELECT COUNT(*)::INTEGER AS tong FROM phien_ban_tep WHERE cong_viec_tao_id = $1 AND loai_phien_ban = 'KET_QUA' AND xoa_luc IS NULL`, [congViecId]);
    return Number(result.rows[0]?.tong || 0);
}

async function demChuyenDoi(congViecId) {
    const result = await layPool().query('SELECT COUNT(*)::INTEGER AS tong FROM chuyen_doi WHERE cong_viec_id = $1', [congViecId]);
    return Number(result.rows[0]?.tong || 0);
}

async function demLichSu(congViecId, loaiSuKien) {
    const result = await layPool().query('SELECT COUNT(*)::INTEGER AS tong FROM lich_su WHERE cong_viec_id = $1 AND loai_su_kien = $2', [congViecId, loaiSuKien]);
    return Number(result.rows[0]?.tong || 0);
}

async function layCongViec(congViecId) {
    const result = await layPool().query('SELECT * FROM cong_viec WHERE id = $1', [congViecId]);
    return result.rows[0] || null;
}

async function layBuoc(congViecId) {
    const result = await layPool().query('SELECT * FROM buoc_cong_viec WHERE cong_viec_id = $1 ORDER BY thu_tu, id LIMIT 1', [congViecId]);
    return result.rows[0] || null;
}

async function layPhienBan(id) {
    const result = await layPool().query('SELECT * FROM phien_ban_tep WHERE id = $1', [id]);
    return result.rows[0] || null;
}

async function tongHanMuc() {
    const result = await layPool().query('SELECT COALESCE(SUM(da_su_dung), 0)::BIGINT AS tong FROM su_dung_han_muc');
    return Number(result.rows[0]?.tong || 0);
}

test.before(async () => {
    await khoiDongRuntimeTest();
    await datGioiHanChinhSach('UPLOAD_KHACH_MAC_DINH', 100);
    await datGioiHanChinhSach('UPLOAD_KHACH_SO_TEP_MOI_LAN', 20);
    await datGioiHanChinhSach('UPLOAD_KHACH_KICH_THUOC_MOI_TEP', 10 * 1024 * 1024);
    agent = taoAgent();
    await workerRuntime.batWorkerTheoQueue(TEN_QUEUE.HINH_ANH);
});

test.after(async () => { await dongRuntimeTest(); });

test('success có đủ source/result/storage/database/history', async () => {
    const nguon = await uploadPng('lifecycle-success.png');
    const tao = await taoPngWebp(nguon);
    const congViecId = tao.congViec.id;
    const status = await choCongViecKetThuc(agent, congViecId);
    assert.equal(status.body.data?.congViec?.trangThai, 'HOAN_THANH');
    const congViec = await layCongViec(congViecId);
    const buoc = await layBuoc(congViecId);
    const phienBanNguon = await layPhienBan(congViec.phien_ban_nguon_id);
    const phienBanKetQua = await layPhienBan(congViec.phien_ban_ket_qua_id);
    assert.equal(congViec.trang_thai, 'HOAN_THANH');
    assert.equal(buoc.trang_thai, 'HOAN_THANH');
    assert.equal(phienBanNguon.trang_thai, 'SAN_SANG');
    assert.equal(phienBanKetQua.trang_thai, 'SAN_SANG');
    assert.equal(await storageService.tonTai(phienBanNguon.storage_key), true);
    assert.equal(await storageService.tonTai(phienBanKetQua.storage_key), true);
    assert.equal(await demKetQua(congViecId), 1);
    assert.equal(await demChuyenDoi(congViecId), 1);
    assert.equal(await demLichSu(congViecId, 'CHUYEN_DOI_DA_TAO'), 1);
    assert.equal(await demLichSu(congViecId, 'CHUYEN_DOI_BAT_DAU'), 1);
    assert.equal(await demLichSu(congViecId, 'TEP_KET_QUA_DA_TAO'), 1);
    assert.equal(await demLichSu(congViecId, 'CHUYEN_DOI_HOAN_THANH'), 1);
});

test('converter fail không tạo output/result rác', async () => {
    const key = 'test:converter-fail';
    transformEngine.dangKyConverter({ key, ten: 'Test converter failure', loaiChuyenDoi: 'CHUYEN_DINH_DANG', nhomXuLy: 'HINH_ANH', dinhDangNguon: 'png', dinhDangDich: 'webp', uuTien: 1000, chiPhi: 1, engine: 'test-fail', phienBanEngine: '1', xuLy: async () => { throw new Error('TEST_CONVERTER_FAIL'); } });
    try {
        const nguon = await uploadPng('lifecycle-converter-fail.png');
        const truoc = await demOutput();
        const tao = await taoPngWebp(nguon, 1, key);
        const congViecId = tao.congViec.id;
        const status = await choCongViecKetThuc(agent, congViecId);
        assert.equal(status.body.data?.congViec?.trangThai, 'THAT_BAI');
        assert.equal(await demKetQua(congViecId), 0);
        assert.equal(await demOutput(), truoc);
        assert.equal(await demTemp(), 0);
        assert.equal(await demLichSu(congViecId, 'CHUYEN_DOI_THAT_BAI'), 1);
    } finally { transformEngine.huyDangKyConverter(key); }
});

test('storage fail không tạo output/result rác', async () => {
    const nguon = await uploadPng('lifecycle-storage-fail.png');
    const truoc = await demOutput();
    const goc = storageService.luuTuBuffer;
    storageService.luuTuBuffer = async function luuTuBufferLoi(khoa, ...args) {
        if (String(khoa).startsWith('output/')) { throw new Error('TEST_STORAGE_FAIL'); }
        return goc.call(storageService, khoa, ...args);
    };
    try {
        const tao = await taoPngWebp(nguon, 1);
        const congViecId = tao.congViec.id;
        const status = await choCongViecKetThuc(agent, congViecId);
        assert.equal(status.body.data?.congViec?.trangThai, 'THAT_BAI');
        assert.equal(await demKetQua(congViecId), 0);
        assert.equal(await demOutput(), truoc);
        assert.equal(await demTemp(), 0);
        assert.equal(await demLichSu(congViecId, 'CHUYEN_DOI_THAT_BAI'), 1);
    } finally { storageService.luuTuBuffer = goc; }
});

test('DB fail sau khi converter tạo output phải cleanup output orphan', async () => {
    const nguon = await uploadPng('lifecycle-db-fail.png');
    const truoc = await demOutput();
    const goc = tepRepository.taoPhienBan;
    tepRepository.taoPhienBan = async function taoPhienBanLoi() { throw new Error('TEST_DB_FAIL_AFTER_OUTPUT'); };
    try {
        const tao = await taoPngWebp(nguon, 1);
        const congViecId = tao.congViec.id;
        const status = await choCongViecKetThuc(agent, congViecId);
        assert.equal(status.body.data?.congViec?.trangThai, 'THAT_BAI');
        assert.equal(await demKetQua(congViecId), 0);
        assert.equal(await demOutput(), truoc);
        assert.equal(await demTemp(), 0);
        assert.equal(await demLichSu(congViecId, 'TEP_KET_QUA_DA_TAO'), 0);
        assert.equal(await demLichSu(congViecId, 'CHUYEN_DOI_THAT_BAI'), 1);
    } finally { tepRepository.taoPhienBan = goc; }
});

test('retry sau khi result đã commit không tạo output/result/history/quota trùng', async () => {
    const nguon = await uploadPng('lifecycle-retry.png');
    const outputTruoc = await demOutput();
    const quotaTruoc = await tongHanMuc();
    const goc = congViecService.capNhatBuoc;
    let daGayLoi = false;
    congViecService.capNhatBuoc = async function capNhatBuocTest(id, data = {}) {
        if (!daGayLoi && data.trangThai === 'HOAN_THANH') { daGayLoi = true; throw new Error('TEST_FAIL_AFTER_RESULT_COMMIT'); }
        return goc.call(congViecService, id, data);
    };
    try {
        const tao = await taoPngWebp(nguon, 2);
        const congViecId = tao.congViec.id;
        const status = await choCongViecKetThuc(agent, congViecId, { timeoutMs: 20000 });
        assert.equal(status.body.data?.congViec?.trangThai, 'HOAN_THANH');
        assert.equal(daGayLoi, true);
        assert.equal(await demKetQua(congViecId), 1);
        assert.equal(await demChuyenDoi(congViecId), 1);
        assert.equal(await demOutput(), outputTruoc + 1);
        assert.equal(await tongHanMuc(), quotaTruoc);
        assert.equal(await demLichSu(congViecId, 'CHUYEN_DOI_BAT_DAU'), 1);
        assert.equal(await demLichSu(congViecId, 'TEP_KET_QUA_DA_TAO'), 1);
        assert.equal(await demLichSu(congViecId, 'CHUYEN_DOI_HOAN_THANH'), 1);
        assert.equal(await demLichSu(congViecId, 'CHUYEN_DOI_THAT_BAI'), 0);
    } finally { congViecService.capNhatBuoc = goc; }
});

test('cancel trước khi worker xử lý không tạo output/result', async () => {
    const nguon = await uploadPng('lifecycle-cancel.png');
    await workerRuntime.dungWorker(TEN_QUEUE.HINH_ANH);
    try {
        const outputTruoc = await demOutput();
        const tao = await taoPngWebp(nguon, 1);
        const congViecId = tao.congViec.id;
        const response = await agent.patch(`/api/v1/cong-viec/${congViecId}/huy`);
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.data?.trangThai, 'DA_HUY');
        assert.equal((await layCongViec(congViecId)).trang_thai, 'DA_HUY');
        assert.equal((await layBuoc(congViecId)).trang_thai, 'DA_HUY');
        assert.equal(await demKetQua(congViecId), 0);
        assert.equal(await demChuyenDoi(congViecId), 0);
        assert.equal(await demOutput(), outputTruoc);
        assert.equal(await demLichSu(congViecId, 'CHUYEN_DOI_DA_HUY'), 1);
    } finally {
        await workerRuntime.batWorkerTheoQueue(TEN_QUEUE.HINH_ANH);
        await new Promise((resolve) => setTimeout(resolve, 200));
    }
});