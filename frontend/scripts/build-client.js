'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const esbuild = require('esbuild');
const JavaScriptObfuscator = require('javascript-obfuscator');

const { DIST_ROOT, PROJECT_ROOT } = require('./clean');

const CLIENT_ROOT = path.join(PROJECT_ROOT, 'src', 'client');

const CLIENT_ENTRY = [
    "require('./core/dom');",
    "require('./core/http');",
    "require('./core/event');",
    "require('./core/form');",
    "require('./core/modal');",
    "require('./core/toast');",
    "require('./core/loading');",
    "require('./auth/otp');",
    "require('./user/upload');",
    "require('./user/conversion');",
    "require('./user/job');",
    "require('./admin/table');"
].join('\n');

function taoHash(content) { return crypto.createHash('sha256').update(content).digest('hex').slice(0, 12); }

async function buildClient() {
    const result = await esbuild.build({ stdin: { contents: CLIENT_ENTRY, resolveDir: CLIENT_ROOT, sourcefile: 'app.js', loader: 'js' }, bundle: true, treeShaking: true, minify: true, platform: 'browser', format: 'iife', target: [ 'es2020' ], write: false, sourcemap: false, legalComments: 'none', define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'silent' });
    const output = result.outputFiles.find((file) => file.path.endsWith('.js')) || result.outputFiles[0];
    if (!output) { throw new Error('Không tạo được bundle client.'); }
    const bundledCode = output.text;
    const obfuscatedCode = JavaScriptObfuscator.obfuscate(bundledCode, { compact: true, controlFlowFlattening: true, controlFlowFlatteningThreshold: 0.5, deadCodeInjection: false, identifierNamesGenerator: 'hexadecimal', renameGlobals: false, selfDefending: true, simplify: true, stringArray: true, stringArrayCallsTransform: true, stringArrayEncoding: [ 'base64' ], stringArrayRotate: true, stringArrayShuffle: true, stringArrayThreshold: 0.75, transformObjectKeys: true, unicodeEscapeSequence: false }).getObfuscatedCode();
    const hash = taoHash(obfuscatedCode);
    const fileName = `app.${hash}.js`;
    const relativePath = `js/${fileName}`;
    await fs.mkdir(path.join(DIST_ROOT, 'js'), { recursive: true });
    await fs.writeFile(path.join(DIST_ROOT, relativePath), `${obfuscatedCode}\n`, 'utf8');
    return { logicalName: 'js/app.js', relativePath, fileName, hash };
}

if (require.main === module) { buildClient().then((result) => console.log(`[FE] CLIENT ${result.relativePath}`)).catch((error) => { console.error(error); process.exitCode = 1; }); }

module.exports = {
    CLIENT_ROOT,
    CLIENT_ENTRY,
    buildClient
};