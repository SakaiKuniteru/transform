'use strict';

const { TEN_QUEUE } = require('../../config/queue');
const queueFactory = require('./queue.factory');

const DANH_SACH_QUEUE = Object.freeze(Object.values(TEN_QUEUE));

function layQueue(tenQueue) { return queueFactory.layQueue(tenQueue); }

function layQueueChuyenDoi() { return layQueue(TEN_QUEUE.CHUYEN_DOI); }

async function kiemTraQueue(tenQueue) {
    const queue = layQueue(tenQueue);
    await queue.waitUntilReady();
    const counts = await queue.getJobCounts('wait', 'active', 'delayed', 'completed', 'failed', 'paused');
    return {
        tenQueue,
        ready: true,
        counts
    };
}

async function kiemTraTatCaQueue() {
    const ketQua = [];
    for (const tenQueue of DANH_SACH_QUEUE) { ketQua.push(await kiemTraQueue(tenQueue)); }
    return ketQua;
}

async function dongTatCaQueue() { return queueFactory.dongTatCaQueueInfrastructure(); }

module.exports = {
    TEN_QUEUE,
    DANH_SACH_QUEUE,
    layQueue,
    layQueueChuyenDoi,
    kiemTraQueue,
    kiemTraTatCaQueue,
    dongTatCaQueue
};