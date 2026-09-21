'use strict';

const { Queue, QueueEvents, Worker } = require('bullmq');
const { taoRedisClient } = require('../../config/redis');
const { coQueue, QUEUE_CONFIG, taoQueueOptions, taoWorkerOptions } = require('../../config/queue');

const queues = new Map();
const queueEvents = new Map();
const workers = new Map();

function batBuocTenQueue(tenQueue) {
    if (!coQueue(tenQueue)) { throw new TypeError(`Queue "${tenQueue}" không hợp lệ.`); }
    return tenQueue;
}

function batBuocProcessor(processor) {
    if (typeof processor !== 'function') { throw new TypeError('Processor của worker phải là một function.'); }
    return processor;
}

function layQueue(tenQueue) {
    const ten = batBuocTenQueue(tenQueue);
    if (queues.has(ten)) { return queues.get(ten).queue; }
    const connection = taoRedisClient();
    try {
        const queue = new Queue(ten, taoQueueOptions(connection));
        queues.set(ten, { queue, connection });
        return queue;
    } catch (error) {
        connection.disconnect();
        throw error;
    }
}

function layQueueEvents(tenQueue) {
    const ten = batBuocTenQueue(tenQueue);
    if (queueEvents.has(ten)) { return queueEvents.get(ten).queueEvents; }
    const connection = taoRedisClient({ worker: true });
    try {
        const events = new QueueEvents(ten, { connection, prefix: QUEUE_CONFIG.prefix });
        queueEvents.set(ten, { queueEvents: events, connection });
        return events;
    } catch (error) {
        connection.disconnect();
        throw error;
    }
}

function taoQueueWorker(tenQueue, processor, options = {}) {
    const ten = batBuocTenQueue(tenQueue);
    batBuocProcessor(processor);
    if (workers.has(ten)) { throw new Error(`Worker cho queue "${ten}" đã được tạo trong process này.`); }
    const connection = taoRedisClient({ worker: true });
    try {
        const worker = new Worker(ten, processor, {
            ...taoWorkerOptions(connection, ten),
            ...options,
            connection,
            prefix: QUEUE_CONFIG.prefix
        });
        workers.set(ten, { worker, connection });
        return worker;
    } catch (error) {
        connection.disconnect();
        throw error;
    }
}

function layQueueWorker(tenQueue) {
    const ten = batBuocTenQueue(tenQueue);
    return workers.get(ten)?.worker || null;
}

async function dongKetNoi(connection) {
    if (!connection || connection.status === 'end') { return; }
    if (connection.status === 'wait') {
        connection.disconnect();
        return;
    }
    try {
        await connection.quit();
    } catch {
        connection.disconnect();
    }
}

async function dongQueue(tenQueue) {
    const ten = batBuocTenQueue(tenQueue);
    const item = queues.get(ten);
    if (!item) { return false; }
    queues.delete(ten);
    await item.queue.close();
    item.queue.removeAllListeners();
    await dongKetNoi(item.connection);
    return true;
}

async function dongQueueEvents(tenQueue) {
    const ten = batBuocTenQueue(tenQueue);
    const item = queueEvents.get(ten);
    if (!item) { return false; }
    queueEvents.delete(ten);
    await item.queueEvents.close();
    item.queueEvents.removeAllListeners();
    await dongKetNoi(item.connection);
    return true;
}

async function dongQueueWorker(tenQueue) {
    const ten = batBuocTenQueue(tenQueue);
    const item = workers.get(ten);
    if (!item) { return false; }
    workers.delete(ten);
    await item.worker.close();
    item.worker.removeAllListeners();
    await dongKetNoi(item.connection);
    return true;
}

async function dongTatCaQueueInfrastructure() {
    await Promise.allSettled([
        ...Array.from(workers.keys()).map(dongQueueWorker),
        ...Array.from(queueEvents.keys()).map(dongQueueEvents),
        ...Array.from(queues.keys()).map(dongQueue)
    ]);
}

module.exports = {
    layQueue,
    layQueueEvents,
    taoQueueWorker,
    layQueueWorker,
    dongQueue,
    dongQueueEvents,
    dongQueueWorker,
    dongTatCaQueueInfrastructure
};