'use strict';

const { chayWorkerDon, dongInfrastructureWorker } = require('./worker');

async function chayWorkerQueue(tenQueue) {
    try { await chayWorkerDon(tenQueue); } catch (error) {
        console.error(`Không thể khởi động Worker "${tenQueue}":`, error);
        await dongInfrastructureWorker().catch(() => {});
        process.exit(1);
    }
}

module.exports = {
    chayWorkerQueue
};