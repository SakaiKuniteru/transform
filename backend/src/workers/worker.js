'use strict';

const path = require('node:path');
const { TEN_QUEUE } = require('../config/queue');
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

function layProcessor(moduleExport, modulePath) {
    if (typeof moduleExport === 'function') { return moduleExport; }
    if (typeof moduleExport?.xuLy === 'function') { return moduleExport.xuLy; }
    throw new TypeError(`Handler "${modulePath}" phải export function hoặc { xuLy }.`);
}

function napHandler(modulePath) {
    const absolute = path.resolve(__dirname, modulePath);
    let resolved;
    try {
        resolved = require.resolve(absolute);
    } catch (error) {
        if (error?.code === 'MODULE_NOT_FOUND') { return null; }
        throw error;
    }
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

async function batWorkerTuDong() {
    const daBat = [];
    for (const [tenQueue, modulePath] of Object.entries(HANDLER_MODULES)) {
        const processor = napHandler(modulePath);
        if (!processor) { continue; }
        await batWorker(tenQueue, processor);
        daBat.push(tenQueue);
    }
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
    await processCleanup.donTatCaProcess();
    await Promise.allSettled(Array.from(workers.keys()).map(dungWorker));
    await queueEvents.dungTatCaQueueEvents();
    await queueFactory.dongTatCaQueueInfrastructure();
    await processCleanup.donTatCaDuongDanTam();
}

async function chay() {
    const daBat = await batWorkerTuDong();
    if (!daBat.length) {
        console.log('Chưa có worker handler nào được triển khai. Hoàn thiện bước 59 trước khi chạy worker xử lý thật.');
        return;
    }
    console.log(`Đã khởi động worker: ${daBat.join(', ')}`);
    let dangDung = false;
    const dung = async (tinHieu) => {
        if (dangDung) { return; }
        dangDung = true;
        console.log(`Đang dừng Worker (${tinHieu})...`);
        await dungTatCaWorker();
        console.log('Worker đã dừng.');
        process.exit(0);
    };
    process.on('SIGINT', () => { void dung('SIGINT'); });
    process.on('SIGTERM', () => { void dung('SIGTERM'); });
}

if (require.main === module) {
    void chay().catch(async (error) => {
        console.error('Không thể khởi động Worker:', error);
        await dungTatCaWorker();
        process.exit(1);
    });
}

module.exports = {
    HANDLER_MODULES,
    taoWorker,
    batWorker,
    batWorkerTuDong,
    dungWorker,
    dungTatCaWorker
};