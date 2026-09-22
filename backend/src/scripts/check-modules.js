'use strict';

const path = require('node:path');

function chay() {
    require('../app');
    require('../modules/chuyen-doi/chuyen-doi.service');
    require('../modules/chuyen-doi/engine/converter-registry');
    require('../modules/chuyen-doi/engine/conversion-planner');
    require('../modules/chuyen-doi/engine/transform-engine.service');
    const worker = require('../workers/worker');
    for (const modulePath of Object.values(worker.HANDLER_MODULES)) { require(path.resolve(__dirname, '../workers', modulePath)); }
    console.log('[Modules] PASS app + engine + toàn bộ worker handler.');
}

if (require.main === module) { try { chay(); } catch (error) { console.error('[Modules] FAIL:', error); process.exitCode = 1; } }

module.exports = { chay };