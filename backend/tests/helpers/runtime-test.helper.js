'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const request = require('supertest');
const sharp = require('sharp');
const { apDungMoiTruongTest } = require('./test-env');

apDungMoiTruongTest();

const env = require('../../src/config/env');
const app = require('../../src/app');
const { layPool, kiemTraKetNoi, dongPool } = require('../../src/infrastructure/database/pool');
const { ketNoiRedis, layRedisClient, dongRedis } = require('../../src/config/redis');
const storageService = require('../../src/infrastructure/storage/storage.service');
const queues = require('../../src/infrastructure/queue/queues');
const workerRuntime = require('../../src/workers/worker');
const { TEN_QUEUE } = require('../../src/config/queue');

function layStorageRootTest() {
    if (path.isAbsolute(env.storage.root)) { return env.storage.root; }
    return path.resolve(env.backendRoot, env.storage.root);
}

async function khoiDongRuntimeTest(options = {}) {
    await kiemTraKetNoi();
    await ketNoiRedis();
    if (options.xoaRedis !== false) { await layRedisClient().flushdb(); }
    if (options.storage !== false) { await storageService.damBaoSanSang(); }
}

async function dongRuntimeTest() {
    await workerRuntime.dungTatCaWorker();
    await queues.dongTatCaQueue();
    try { await layRedisClient().flushdb(); } catch {}
    await Promise.allSettled([dongRedis(), dongPool()]);
    if (env.storage.driver === 'local') { await fs.promises.rm(layStorageRootTest(), { recursive: true, force: true }); }
}

function taoAgent() { return request.agent(app); }

function taoRequest() { return request(app); }

async function taoAnhBuffer(format = 'png', width = 320, height = 180) {
    let image = sharp({ create: { width, height, channels: 4, background: { r: 37, g: 99, b: 235, alpha: 1 } } });
    if (format === 'png') { return image.png().toBuffer(); }
    if (format === 'jpeg' || format === 'jpg') { return image.jpeg({ quality: 90 }).toBuffer(); }
    if (format === 'webp') { return image.webp({ quality: 90 }).toBuffer(); }
    throw new TypeError(`Định dạng ảnh test "${format}" không hợp lệ.`);
}

async function uploadBuffer(agent, buffer, tenTep, mimeType, accessToken = null) {
    let req = agent.post('/api/v1/tep/upload').attach('teps', buffer, { filename: tenTep, contentType: mimeType });
    if (accessToken) { req = req.set('Authorization', `Bearer ${accessToken}`); }
    return req;
}

function layThongTinUpload(response) {
    const tep = response.body?.data?.[0] || null;
    return {
        tep,
        tepId: tep?.id || null,
        phienBanId: tep?.phienBanHienTai?.id || null
    };
}

function binaryParser(res, callback) {
    const chunks = [];
    res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    res.on('end', () => callback(null, Buffer.concat(chunks)));
}

async function taiXuongBuffer(agent, tepId, accessToken = null) {
    let req = agent.get(`/api/v1/tep/${tepId}/tai-xuong`).buffer(true).parse(binaryParser);
    if (accessToken) { req = req.set('Authorization', `Bearer ${accessToken}`); }
    return req;
}

async function choCongViecKetThuc(agent, congViecId, options = {}) {
    const timeoutMs = Number(options.timeoutMs || 15000);
    const intervalMs = Number(options.intervalMs || 100);
    const batDau = Date.now();
    while (Date.now() - batDau < timeoutMs) {
        const response = await agent.get(`/api/v1/chuyen-doi/${congViecId}`);
        const congViec = response.body?.data?.congViec;
        if (['HOAN_THANH', 'THAT_BAI', 'DA_HUY'].includes(congViec?.trangThai)) { return response; }
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new Error(`Công việc ${congViecId} không kết thúc trong ${timeoutMs}ms.`);
}

async function datGioiHanChinhSach(ma, gioiHan, khongGioiHan = false) {
    const result = await layPool().query(`
        UPDATE chinh_sach_han_muc
        SET gioi_han = $1, khong_gioi_han = $2
        WHERE ma = $3
        RETURNING id
    `, [khongGioiHan ? null : gioiHan, khongGioiHan, ma]);
    if (!result.rows[0]) { throw new Error(`Không tìm thấy chính sách "${ma}".`); }
    return result.rows[0];
}

async function taoNguoiDungTest(options = {}) {
    const suffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const email = options.email || `test-${suffix}@transform.local`;
    const tenDangNhap = options.tenDangNhap || `test_${suffix.replaceAll('-', '_')}`;
    const matKhau = options.matKhau || 'Test@123456';
    const result = await layPool().query(`
        INSERT INTO nguoi_dung (
            email,
            ten_dang_nhap,
            ho_ten,
            mat_khau_hash,
            loai_tai_khoan,
            trang_thai,
            email_xac_thuc_luc
        )
        VALUES ($1,$2,$3,crypt($4,gen_salt('bf',12)),'NGUOI_DUNG','HOAT_DONG',NOW())
        RETURNING id,email,ten_dang_nhap
    `, [email, tenDangNhap, options.hoTen || 'Người dùng test', matKhau]);
    return {
        id: result.rows[0].id,
        email,
        tenDangNhap,
        matKhau
    };
}

async function dangNhap(agent, tenDangNhap, matKhau) {
    const response = await agent.post('/api/v1/xac-thuc/dang-nhap').send({ tenDangNhap, matKhau });
    if (response.statusCode !== 200 || !response.body?.data?.accessToken) { throw new Error(`Đăng nhập test thất bại: ${response.statusCode}.`); }
    return response.body.data.accessToken;
}

async function batWorkerHinhAnh() {
    const handler = require('../../src/workers/handlers/hinh-anh.handler');
    return workerRuntime.batWorker(TEN_QUEUE.HINH_ANH, handler.xuLy);
}

module.exports = {
    env,
    app,
    request,
    sharp,
    storageService,
    layPool,
    taoAgent,
    taoRequest,
    khoiDongRuntimeTest,
    dongRuntimeTest,
    taoAnhBuffer,
    uploadBuffer,
    layThongTinUpload,
    taiXuongBuffer,
    choCongViecKetThuc,
    datGioiHanChinhSach,
    taoNguoiDungTest,
    dangNhap,
    batWorkerHinhAnh
};