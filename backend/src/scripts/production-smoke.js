'use strict';

const crypto = require('node:crypto');
const sharp = require('sharp');
const YAML = require('yaml');
const { layPool, dongPool } = require('../infrastructure/database/pool');
const { LOAI_CHUYEN_DOI, DANH_SACH_LOAI_CHUYEN_DOI_HO_TRO } = require('../constants/loai-chuyen-doi');
const { DINH_DANG } = require('../constants/dinh-dang-tep');

const BASE_URL = String(process.env.PRODUCTION_SMOKE_BASE_URL || 'http://127.0.0.1:2310').replace(/\/$/, '');
const TIMEOUT_MS = Number(process.env.PRODUCTION_SMOKE_TIMEOUT_MS || 30000);
const INTERVAL_MS = Number(process.env.PRODUCTION_SMOKE_INTERVAL_MS || 250);

function assert(condition, message) { if (!condition) { throw new Error(message); } }
function taoClient() { return { cookies: new Map() }; }
function cookieHeader(client) { return Array.from(client.cookies.entries()).map(([key, value]) => `${key}=${value}`).join('; '); }

function capNhatCookie(client, response) {
    const values = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [response.headers.get('set-cookie')].filter(Boolean);
    for (const value of values) {
        const pair = String(value).split(';', 1)[0];
        const index = pair.indexOf('=');
        if (index > 0) { client.cookies.set(pair.slice(0, index), pair.slice(index + 1)); }
    }
}

async function goi(client, pathname, options = {}) {
    const headers = new Headers(options.headers || {});
    const cookie = cookieHeader(client);
    if (cookie) { headers.set('Cookie', cookie); }
    const response = await fetch(`${BASE_URL}${pathname}`, { ...options, headers, signal: AbortSignal.timeout(Number(options.timeoutMs || TIMEOUT_MS)) });
    capNhatCookie(client, response);
    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    const body = contentType.includes('application/json') ? await response.json() : Buffer.from(await response.arrayBuffer());
    return { status: response.status, body };
}

async function upload(client, buffer, tenTep, mimeType) {
    const form = new FormData();
    form.append('teps', new Blob([buffer], { type: mimeType }), tenTep);
    const response = await goi(client, '/api/v1/tep/upload', { method: 'POST', body: form });
    assert(response.status === 201, `Upload ${tenTep} thất bại: HTTP ${response.status}`);
    const tep = response.body?.data?.[0];
    assert(tep?.id && tep?.phienBanHienTai?.id, `Upload ${tenTep} thiếu tep/phienBan.`);
    return { tepId: tep.id, phienBanId: tep.phienBanHienTai.id };
}

async function taoChuyenDoi(client, nguon, loaiChuyenDoi, dinhDangDich = null, tuyChon = {}) {
    const body = { tepNguonId: nguon.tepId, phienBanNguonId: nguon.phienBanId, loaiChuyenDoi, tuyChon };
    if (dinhDangDich) { body.dinhDangDich = dinhDangDich; }
    return goi(client, '/api/v1/chuyen-doi', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `prod-smoke-${crypto.randomUUID()}` }, body: JSON.stringify(body) });
}

async function choKetThuc(client, congViecId) {
    const batDau = Date.now();
    while (Date.now() - batDau < TIMEOUT_MS) {
        const response = await goi(client, `/api/v1/chuyen-doi/${congViecId}`);
        assert(response.status === 200, `Không đọc được công việc ${congViecId}: HTTP ${response.status}`);
        const trangThai = response.body?.data?.congViec?.trangThai;
        if (['HOAN_THANH','THAT_BAI','DA_HUY'].includes(trangThai)) { return response.body.data.congViec; }
        await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
    }
    throw new Error(`Công việc ${congViecId} timeout.`);
}

async function download(client, tepId) {
    const response = await goi(client, `/api/v1/tep/${tepId}/tai-xuong`);
    assert(response.status === 200, `Download ${tepId} thất bại.`);
    assert(Buffer.isBuffer(response.body), 'Download không trả binary.');
    return response.body;
}

async function chayConversion(client, nguon, loai, dich = null, tuyChon = {}) {
    const create = await taoChuyenDoi(client, nguon, loai, dich, tuyChon);
    assert(create.status === 201, `${loai} create thất bại: HTTP ${create.status}`);
    const congViec = create.body?.data?.congViec;
    assert(congViec?.id, `${loai} thiếu congViecId.`);
    const hoanTat = await choKetThuc(client, congViec.id);
    assert(hoanTat.trangThai === 'HOAN_THANH', `${loai} kết thúc ${hoanTat.trangThai}.`);
    assert(hoanTat.tepKetQuaId, `${loai} thiếu tepKetQuaId.`);
    return { create: create.body.data, congViec: hoanTat, output: await download(client, hoanTat.tepKetQuaId) };
}

async function demCongViec() {
    const result = await layPool().query('SELECT COUNT(*)::INTEGER AS tong FROM cong_viec');
    return Number(result.rows[0]?.tong || 0);
}

async function taoPng(width = 120, height = 80) {
    return sharp({ create: { width, height, channels: 4, background: { r: 25, g: 80, b: 180, alpha: 1 } } }).png().toBuffer();
}

async function kiemTraHealth() {
    const client = taoClient();
    const health = await goi(client, '/api/v1/health');
    assert(health.status === 200 && health.body?.data?.status === 'OK', 'Health chưa OK.');
    const ready = await goi(client, '/api/v1/health/ready');
    assert(ready.status === 200 && ready.body?.data?.status === 'READY', 'Ready chưa READY.');
    console.log('[Smoke] health + ready PASS');
}

async function kiemTraPngWebp() {
    const client = taoClient();
    const png = await taoPng();
    const nguon = await upload(client, png, 'prod-smoke-png-webp.png', 'image/png');
    const result = await chayConversion(client, nguon, LOAI_CHUYEN_DOI.CHUYEN_DINH_DANG, DINH_DANG.WEBP);
    const metadata = await sharp(result.output).metadata();
    assert(metadata.format === 'webp', 'PNG → WebP sai định dạng.');
    console.log('[Smoke] PNG → WebP PASS');
}

async function kiemTraJsonYaml() {
    const client = taoClient();
    const data = { ten: 'Transform', smoke: true, version: 1 };
    const nguon = await upload(client, Buffer.from(JSON.stringify(data)), 'prod-smoke-json-yaml.json', 'application/json');
    const result = await chayConversion(client, nguon, LOAI_CHUYEN_DOI.CHUYEN_DINH_DANG, DINH_DANG.YAML);
    assert(JSON.stringify(YAML.parse(result.output.toString('utf8'))) === JSON.stringify(data), 'JSON → YAML sai nội dung.');
    console.log('[Smoke] JSON → YAML PASS');
}

async function kiemTraMaHoaMacDinh() {
    const client = taoClient();
    const png = await taoPng(64, 64);
    const nguon = await upload(client, png, 'prod-smoke-base64.png', 'image/png');
    const result = await chayConversion(client, nguon, LOAI_CHUYEN_DOI.MA_HOA);
    assert(result.create?.congViec?.dinhDangDich === DINH_DANG.BASE64, 'MA_HOA không default BASE64.');
    assert(Buffer.compare(Buffer.from(result.output.toString('ascii').trim(), 'base64'), png) === 0, 'BASE64 decode không khớp nguồn.');
    console.log('[Smoke] PNG → MA_HOA mặc định BASE64 PASS');
}

async function kiemTraFeatureDisabled() {
    const client = taoClient();
    const nguon = await upload(client, await taoPng(32, 32), 'prod-smoke-disabled.png', 'image/png');
    const truoc = await demCongViec();
    const danhSach = [LOAI_CHUYEN_DOI.GOP, LOAI_CHUYEN_DOI.SO_SANH, LOAI_CHUYEN_DOI.NHAN_DIEN_NGON_NGU];
    if (!DANH_SACH_LOAI_CHUYEN_DOI_HO_TRO.includes(LOAI_CHUYEN_DOI.OCR)) { danhSach.unshift(LOAI_CHUYEN_DOI.OCR); }
    for (const loai of danhSach) {
        const response = await taoChuyenDoi(client, nguon, loai, DINH_DANG.TXT);
        assert([400,422].includes(response.status), `${loai} đáng lẽ reject nhưng HTTP ${response.status}.`);
    }
    assert(await demCongViec() === truoc, 'Feature disabled đã tạo job.');
    console.log(`[Smoke] Disabled features ${danhSach.join(', ')} PASS`);
}

async function chay() {
    console.log(`[Smoke] Base URL: ${BASE_URL}`);
    await kiemTraHealth();
    await kiemTraPngWebp();
    await kiemTraJsonYaml();
    await kiemTraMaHoaMacDinh();
    await kiemTraFeatureDisabled();
    console.log('[Smoke] PRODUCTION E2E PASS');
}

if (require.main === module) { void chay().catch((error) => { console.error('[Smoke] FAIL:', error); process.exitCode = 1; }).finally(() => dongPool().catch(() => {})); }

module.exports = { chay };