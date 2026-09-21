'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {
    khoiDongRuntimeTest,
    dongRuntimeTest
} = require('../helpers/runtime-test.helper');

const queueFactory = require('../../src/infrastructure/queue/queue.factory');
const queueService = require('../../src/infrastructure/queue/queue.service');
const { TEN_QUEUE } = require('../../src/config/queue');

let queue;
let queueEvents;

function taoJobId(prefix) { return `${prefix}-${crypto.randomUUID()}`; }

async function taoWorker(processor) {
    const worker = queueFactory.taoQueueWorker(TEN_QUEUE.AI, processor, { concurrency: 1 });
    await worker.waitUntilReady();
    return worker;
}

async function dongWorker() { await queueFactory.dongQueueWorker(TEN_QUEUE.AI); }

test.before(async () => {
    await khoiDongRuntimeTest();
    queue = queueFactory.layQueue(TEN_QUEUE.AI);
    queueEvents = queueFactory.layQueueEvents(TEN_QUEUE.AI);
    await queue.waitUntilReady();
    await queueEvents.waitUntilReady();
    await queue.obliterate({ force: true });
});

test.afterEach(async () => {
    await dongWorker();
    await queue.obliterate({ force: true });
});

test.after(async () => { await dongRuntimeTest(); });

test('BullMQ xử lý job thành công', async () => {
    await taoWorker(async (job) => ({ ok: true, value: job.data.value }));
    const job = await queueService.themJob({
        tenQueue: TEN_QUEUE.AI,
        tenJob: 'TEST_SUCCESS',
        jobId: taoJobId('success'),
        data: { value: 123 }
    });
    const result = await job.waitUntilFinished(queueEvents, 5000);
    assert.deepEqual(result, { ok: true, value: 123 });
    assert.equal(await job.getState(), 'completed');
});

test('BullMQ retry rồi thành công', async () => {
    let soLan = 0;
    await taoWorker(async () => {
        soLan += 1;
        if (soLan === 1) { throw new Error('LOI_LAN_1'); }
        return { ok: true, soLan };
    });
    const job = await queueService.themJob({
        tenQueue: TEN_QUEUE.AI,
        tenJob: 'TEST_RETRY',
        jobId: taoJobId('retry'),
        data: {},
        options: {
            attempts: 2,
            backoff: {
                type: 'fixed',
                delay: 50
            }
        }
    });
    const result = await job.waitUntilFinished(queueEvents, 5000);
    assert.equal(result.ok, true);
    assert.equal(soLan, 2);
    assert.equal(await job.getState(), 'completed');
});

test('BullMQ đưa job vào failed sau khi hết retry', async () => {
    await taoWorker(async () => { throw new Error('LUON_THAT_BAI'); });
    const job = await queueService.themJob({
        tenQueue: TEN_QUEUE.AI,
        tenJob: 'TEST_FAILED',
        jobId: taoJobId('failed'),
        data: {},
        options: {
            attempts: 2,
            backoff: {
                type: 'fixed',
                delay: 20
            }
        }
    });
    await assert.rejects(job.waitUntilFinished(queueEvents, 5000), /LUON_THAT_BAI/);
    assert.equal(await job.getState(), 'failed');
});

test('BullMQ không tạo job thứ hai khi dùng cùng jobId', async () => {
    const jobId = taoJobId('idempotent');
    const job1 = await queueService.themJob({ tenQueue: TEN_QUEUE.AI, tenJob: 'TEST_DUPLICATE', jobId, data: { lan: 1 } });
    const job2 = await queueService.themJob({ tenQueue: TEN_QUEUE.AI, tenJob: 'TEST_DUPLICATE', jobId, data: { lan: 2 } });
    assert.equal(String(job1.id), jobId);
    assert.equal(String(job2.id), jobId);
    const jobTrongQueue = await queue.getJob(jobId);
    assert.ok(jobTrongQueue);
});

test('BullMQ ưu tiên job priority nhỏ hơn', async () => {
    const thuTu = [];
    const jobThap = await queueService.themJob({ tenQueue: TEN_QUEUE.AI, tenJob: 'LOW', jobId: taoJobId('low'), data: { ten: 'LOW' }, options: { priority: 10 } });
    const jobCao = await queueService.themJob({ tenQueue: TEN_QUEUE.AI, tenJob: 'HIGH', jobId: taoJobId('high'), data: { ten: 'HIGH' }, options: { priority: 1 } });
    await taoWorker(async (job) => {
        thuTu.push(job.data.ten);
        return job.data.ten;
    });
    await Promise.all([
        jobThap.waitUntilFinished(queueEvents, 5000),
        jobCao.waitUntilFinished(queueEvents, 5000)
    ]);
    assert.deepEqual(thuTu, ['HIGH', 'LOW']);
});

test('Queue service xóa được job chưa active', async () => {
    const job = await queueService.themJob({
        tenQueue: TEN_QUEUE.AI,
        tenJob: 'TEST_CANCEL',
        jobId: taoJobId('cancel'),
        data: {},
        options: { delay: 60000 }
    });
    const result = await queueService.xoaJob(TEN_QUEUE.AI, String(job.id));
    assert.equal(result.daXoa, true);
    assert.equal(await queue.getJob(String(job.id)), undefined);
});