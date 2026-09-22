'use strict';

const { TEN_QUEUE } = require('../../config/queue');
const queueFactory = require('./queue.factory');

const dangKy = new Map();

function log(tenQueue, suKien, data = null) {
    if (data === null || data === undefined) {
        console.log(`[Queue:${tenQueue}] ${suKien}`);
        return;
    }
    console.log(`[Queue:${tenQueue}] ${suKien}`, data);
}

function goiHandler(handler, payload) {
    if (typeof handler !== 'function') { return; }
    try {
        const ketQua = handler(payload);
        if (ketQua && typeof ketQua.catch === 'function') { ketQua.catch((error) => console.error('[QueueEvents] Handler thất bại:', error)); }
    } catch (error) {
        console.error('[QueueEvents] Handler thất bại:', error);
    }
}

async function batQueueEvents(tenQueue, handlers = {}) {
    if (dangKy.has(tenQueue)) { return dangKy.get(tenQueue); }
    const events = queueFactory.layQueueEvents(tenQueue);
    const listeners = {
        waiting: (data) => { log(tenQueue, 'waiting', data); goiHandler(handlers.waiting, data); },
        active: (data) => { log(tenQueue, 'active', data); goiHandler(handlers.active, data); },
        progress: (data) => { goiHandler(handlers.progress, data); },
        completed: (data) => { log(tenQueue, 'completed', data); goiHandler(handlers.completed, data); },
        failed: (data) => { console.error(`[Queue:${tenQueue}] failed`, data); goiHandler(handlers.failed, data); },
        stalled: (data) => { console.warn(`[Queue:${tenQueue}] stalled`, data); goiHandler(handlers.stalled, data); },
        removed: (data) => { goiHandler(handlers.removed, data); },
        error: (error) => { console.error(`[Queue:${tenQueue}] error`, error); goiHandler(handlers.error, error); }
    };
    for (const [suKien, listener] of Object.entries(listeners)) { events.on(suKien, listener); }
    try {
        await events.waitUntilReady();
    } catch (error) {
        for (const [suKien, listener] of Object.entries(listeners)) { events.off(suKien, listener); }
        await queueFactory.dongQueueEvents(tenQueue);
        throw error;
    }
    const registration = Object.freeze({ tenQueue, events, listeners });
    dangKy.set(tenQueue, registration);
    return registration;
}

async function batTatCaQueueEvents(handlersTheoQueue = {}) {
    const ketQua = [];
    for (const tenQueue of Object.values(TEN_QUEUE)) { ketQua.push(await batQueueEvents(tenQueue, handlersTheoQueue[tenQueue] || {})); }
    return ketQua;
}

async function dungQueueEvents(tenQueue) {
    const registration = dangKy.get(tenQueue);
    if (!registration) { return false; }
    dangKy.delete(tenQueue);
    for (const [suKien, listener] of Object.entries(registration.listeners)) { registration.events.off(suKien, listener); }
    await queueFactory.dongQueueEvents(tenQueue);
    return true;
}

async function dungTatCaQueueEvents() { await Promise.allSettled(Array.from(dangKy.keys()).map(dungQueueEvents)); }

module.exports = {
    batQueueEvents,
    batTatCaQueueEvents,
    dungQueueEvents,
    dungTatCaQueueEvents
};