'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const { clean, DIST_ROOT, PROJECT_ROOT } = require('./clean');
const { buildClient } = require('./build-client');
const { buildCss } = require('./build-css');
const { checkClientSource, checkDist } = require('./check-source');

const ASSET_SOURCE_ROOT = path.join(PROJECT_ROOT, 'src', 'assets');
const COPY_DIRS = Object.freeze([ 'images', 'fonts' ]);

async function tonTai(target) {
    try { await fs.access(target); return true; } catch (error) { return false; }
}

async function copyStaticAssets() {
    for (const dirName of COPY_DIRS) {
        const source = path.join(ASSET_SOURCE_ROOT, dirName);
        const destination = path.join(DIST_ROOT, dirName);
        if (!await tonTai(source)) { continue; }
        await fs.cp(source, destination, { recursive: true, force: true });
    }
}

async function ghiManifest(entries) {
    const assets = {};
    for (const entry of entries) { assets[entry.logicalName] = entry.relativePath; }
    const manifest = { assets };
    await fs.writeFile(path.join(DIST_ROOT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    return manifest;
}

async function build() {
    await checkClientSource();
    await clean();
    const css = await buildCss();
    const client = await buildClient();
    await copyStaticAssets();
    const manifest = await ghiManifest([ css, client ]);
    await checkDist();
    console.log(`[FE] CSS ${manifest.assets['css/app.css']}`);
    console.log(`[FE] JS  ${manifest.assets['js/app.js']}`);
    console.log('[FE] BUILD PASS');
    return manifest;
}

if (require.main === module) { build().catch((error) => { console.error(error); process.exitCode = 1; }); }

module.exports = {
    ASSET_SOURCE_ROOT,
    COPY_DIRS,
    copyStaticAssets,
    ghiManifest,
    build
};