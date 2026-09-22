'use strict';

const path = require('node:path');
const { TEN_QUEUE } = require('../config/queue');
const { kiemTraKetNoi, dongPool } = require('../infrastructure/database/pool');
const { ketNoiRedis, dongRedis } = require('../config/redis');
const storageService = require('../infrastructure/storage/storage.service');
const queueFactory = require('../infrastructure/queue/queue.factory');
const queueEvents = require('../infrastructure/queue/queue-events');
const processCleanup = require('../infrastructure/process/process-cleanup');

const workers = new Map();

const HANDLER_MODULES = Object.freeze({
    [TEN_QUEUE.CHUYEN_DOI]: './handlers/chuyen-doi.handler',
    [TEN_QUEUE.TAI_LIEU]: './handlers/tai-lieu.handler',
    [TEN_QUEUE.DU_LIEU]: './handlers/du-lieu.handler',
    [TEN_QUEUE.NEN]: './handlers/nen.handler',
    [TEN_QUEUE.HINH_ANH]: './handlers/hinh-anh.handler',
    [TEN_QUEUE.OCR]: './handlers/ocr.handler',
    [TEN_QUEUE.DICH]: './handlers/dich.handler',
    [TEN_QUEUE.AI]: './handlers/ai.handler'
});

let daDangKyShutdown = false;
let dangDungWorker = false;

function layProcessor(moduleExport, modulePath) { if (typeof moduleExport === 'function') { return moduleExport; } if (typeof moduleExport?.xuLy === 'function') { return moduleExport.xuLy; } throw new TypeError(`Handler "${modulePath}" phải export function hoặc { xuLy }.`); }

function napHandler(modulePath) {
    const absolute = path.resolve(__dirname, modulePath);
    let resolved;
    try { resolved = require.resolve(absolute); } catch (error) { if (error?.code === 'MODULE_NOT_FOUND') { return null; } throw error; }
    const moduleExport = require(resolved);
    if (!moduleExport || (typeof moduleExport !== 'function' && typeof moduleExport.xuLy !== 'function')) { return null; }
    return layProcessor(moduleExport, modulePath);
}

function taoContext(job) {
    return Object.freeze({
        tenQueue: job.queueName,
        jobId: String(job.id),
        congViecId: job.data?.congViecId || null,
        buocId: job.data?.buocId || null,
        attemptsMade: job.attemptsMade,
        capNhatTienTrinh: async (value) => job.updateProgress(value),
        layTrangThai: async () => job.getState()
    });
}

function taoWorker(tenQueue, processor) {
    if (workers.has(tenQueue)) { return workers.get(tenQueue); }
    const worker = queueFactory.taoQueueWorker(tenQueue, async (job) => processor(job, taoContext(job)));
    worker.on('ready', () => console.log(`[Worker:${tenQueue}] ready`));
    worker.on('active', (job) => console.log(`[Worker:${tenQueue}] active ${job.id}`));
    worker.on('completed', (job) => console.log(`[Worker:${tenQueue}] completed ${job.id}`));
    worker.on('failed', (job, error) => console.error(`[Worker:${tenQueue}] failed ${job?.id || '-'}:`, error));
    worker.on('stalled', (jobId) => console.warn(`[Worker:${tenQueue}] stalled ${jobId}`));
    worker.on('error', (error) => console.error(`[Worker:${tenQueue}] error:`, error));
    workers.set(tenQueue, worker);
    return worker;
}

async function batWorker(tenQueue, processor) {
    const worker = taoWorker(tenQueue, processor);
    await worker.waitUntilReady();
    await queueEvents.batQueueEvents(tenQueue);
    return worker;
}

async function batWorkerTheoQueue(tenQueue) {
    const modulePath = HANDLER_MODULES[tenQueue];
    if (!modulePath) { throw new Error(`Không có handler cho queue "${tenQueue}".`); }
    const processor = napHandler(modulePath);
    if (!processor) { throw new Error(`Không thể nạp handler "${modulePath}" cho queue "${tenQueue}".`); }
    await batWorker(tenQueue, processor);
    return tenQueue;
}

async function batWorkerTuDong() {
    const daBat = [];
    for (const tenQueue of Object.keys(HANDLER_MODULES)) { daBat.push(await batWorkerTheoQueue(tenQueue)); }
    return daBat;
}

async function dungWorker(tenQueue) {
    if (!workers.has(tenQueue)) { return false; }
    workers.delete(tenQueue);
    await queueEvents.dungQueueEvents(tenQueue);
    await queueFactory.dongQueueWorker(tenQueue);
    return true;
}

async function dungTatCaWorker() {
    await Promise.allSettled(Array.from(workers.keys()).map(dungWorker));
    await queueEvents.dungTatCaQueueEvents();
    await queueFactory.dongTatCaQueueInfrastructure();
    await processCleanup.donTatCaProcess();
    await processCleanup.donTatCaDuongDanTam();
}

async function khoiDongInfrastructureWorker() {
    await kiemTraKetNoi();
    await ketNoiRedis();
    await storageService.damBaoSanSang();
}

async function dongInfrastructureWorker() {
    await dungTatCaWorker();
    await Promise.allSettled([dongRedis(), dongPool()]);
}

async function dungWorkerProcess(tinHieu, exitCode = 0) {
    if (dangDungWorker) { return; }
    dangDungWorker = true;
    console.log(`Đang dừng Worker (${tinHieu})...`);
    let maThoat = exitCode;
    try { await dongInfrastructureWorker(); } catch (error) { maThoat = 1; console.error('Không thể đóng Worker an toàn:', error); }
    console.log('Worker đã dừng.');
    process.exit(maThoat);
}

function dangKyShutdown() {
    if (daDangKyShutdown) { return; }
    daDangKyShutdown = true;
    process.on('SIGINT', () => { void dungWorkerProcess('SIGINT'); });
    process.on('SIGTERM', () => { void dungWorkerProcess('SIGTERM'); });
    process.on('unhandledRejection', (reason) => { console.error('Worker Unhandled Promise Rejection:', reason); void dungWorkerProcess('unhandledRejection', 1); });
    process.on('uncaughtException', (error) => { console.error('Worker Uncaught Exception:', error); void dungWorkerProcess('uncaughtException', 1); });
}

async function chayDanhSachWorker(danhSachQueue) {
    if (!Array.isArray(danhSachQueue) || !danhSachQueue.length) { throw new TypeError('Danh sách queue worker không hợp lệ.'); }
    await khoiDongInfrastructureWorker();
    const daBat = [];
    for (const tenQueue of danhSachQueue) { daBat.push(await batWorkerTheoQueue(tenQueue)); }
    dangKyShutdown();
    console.log(`Đã khởi động worker: ${daBat.join(', ')}`);
    return daBat;
}

async function chayWorkerDon(tenQueue) { return chayDanhSachWorker([tenQueue]); }

async function chay() { return chayDanhSachWorker(Object.keys(HANDLER_MODULES)); }

if (require.main === module) {
    void chay().catch(async (error) => {
        console.error('Không thể khởi động Worker:', error);
        await dongInfrastructureWorker().catch(() => {});
        process.exit(1);
    });
}

module.exports = {
    HANDLER_MODULES,
    taoWorker,
    batWorker,
    batWorkerTheoQueue,
    batWorkerTuDong,
    chayWorkerDon,
    chayDanhSachWorker,
    dungWorker,
    dungTatCaWorker,
    dongInfrastructureWorker
};