'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PUBLIC_ROOT = path.join(PROJECT_ROOT, 'public');
const DIST_ROOT = path.join(PUBLIC_ROOT, 'dist');
const DIST_DIRS = Object.freeze([ 'css', 'js', 'images', 'fonts' ]);

function kiemTraDuongDan() {
    if (!DIST_ROOT.startsWith(`${PUBLIC_ROOT}${path.sep}`)) { throw new Error('Đường dẫn public/dist không an toàn.'); }
}

async function clean() {
    kiemTraDuongDan();
    await fs.rm(DIST_ROOT, { recursive: true, force: true });
    await fs.mkdir(DIST_ROOT, { recursive: true });
    for (const dir of DIST_DIRS) { await fs.mkdir(path.join(DIST_ROOT, dir), { recursive: true }); }
    return DIST_ROOT;
}

if (require.main === module) { clean().then(() => console.log('[FE] CLEAN PASS')).catch((error) => { console.error(error); process.exitCode = 1; }); }

module.exports = {
    PROJECT_ROOT,
    PUBLIC_ROOT,
    DIST_ROOT,
    DIST_DIRS,
    clean
};