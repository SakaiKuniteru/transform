'use strict';

const env = require('./env');

const TEN_QUEUE = Object.freeze({
    CHUYEN_DOI: 'chuyen-doi',
    TAI_LIEU: 'tai-lieu',
    DU_LIEU: 'du-lieu',
    NEN: 'nen',
    HINH_ANH: 'hinh-anh',
    OCR: 'ocr',
    DICH: 'dich',
    AI: 'ai'
});

const QUEUE_CONFIG = Object.freeze({
    prefix: env.queue.prefix,

    defaultJobOptions: Object.freeze({
        attempts: env.queue.defaultAttempts,
        backoff: Object.freeze({
            type: env.queue.backoffType,
            delay: env.queue.backoffDelayMs
        }),
        removeOnComplete: Object.freeze({
            age: env.queue.removeCompleteAgeSeconds,
            count: env.queue.removeCompleteCount
        }),
        removeOnFail: Object.freeze({
            age: env.queue.removeFailAgeSeconds,
            count: env.queue.removeFailCount
        })
    }),

    worker: Object.freeze({
        lockDuration: env.queue.lockDurationMs,
        stalledInterval: env.queue.stalledIntervalMs,
        maxStalledCount: env.queue.maxStalledCount
    }),

    concurrency: Object.freeze({
        [TEN_QUEUE.CHUYEN_DOI]: env.queue.concurrency.default,
        [TEN_QUEUE.TAI_LIEU]: env.queue.concurrency.taiLieu,
        [TEN_QUEUE.DU_LIEU]: env.queue.concurrency.duLieu,
        [TEN_QUEUE.NEN]: env.queue.concurrency.nen,
        [TEN_QUEUE.HINH_ANH]: env.queue.concurrency.hinhAnh,
        [TEN_QUEUE.OCR]: env.queue.concurrency.ocr,
        [TEN_QUEUE.DICH]: env.queue.concurrency.dich,
        [TEN_QUEUE.AI]: env.queue.concurrency.ai
    })
});

function layTenQueue(loai) {
    return TEN_QUEUE[loai] || null;
}

function coQueue(tenQueue) {
    return Object.values(TEN_QUEUE).includes(tenQueue);
}

function layConcurrency(tenQueue) {
    return QUEUE_CONFIG.concurrency[tenQueue] || env.queue.concurrency.default;
}

function taoQueueOptions(connection) {
    return {
        connection,
        prefix: QUEUE_CONFIG.prefix,
        defaultJobOptions: QUEUE_CONFIG.defaultJobOptions
    };
}

function taoWorkerOptions(connection, tenQueue) {
    return {
        connection,
        prefix: QUEUE_CONFIG.prefix,
        concurrency: layConcurrency(tenQueue),
        lockDuration: QUEUE_CONFIG.worker.lockDuration,
        stalledInterval: QUEUE_CONFIG.worker.stalledInterval,
        maxStalledCount: QUEUE_CONFIG.worker.maxStalledCount
    };
}

module.exports = {
    TEN_QUEUE,
    QUEUE_CONFIG,
    layTenQueue,
    coQueue,
    layConcurrency,
    taoQueueOptions,
    taoWorkerOptions
};