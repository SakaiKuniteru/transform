'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const env = require('../config/env');

function lietKeJs(root) {
    const ketQua = [];
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
        const full = path.join(root, entry.name);
        if (entry.isDirectory()) { ketQua.push(...lietKeJs(full)); }
        else if (entry.isFile() && entry.name.endsWith('.js')) { ketQua.push(full); }
    }
    return ketQua.sort();
}

function chay() {
    const danhSach = [...lietKeJs(path.resolve(env.backendRoot, 'src')), ...lietKeJs(path.resolve(env.backendRoot, 'tests'))];
    for (const file of danhSach) {
        let code = fs.readFileSync(file, 'utf8');
        if (code.startsWith('#!')) { code = code.replace(/^#!.*(?:\r?\n|$)/, ''); }
        try { new vm.Script(code, { filename: file, displayErrors: true }); }
        catch (error) { throw new Error(`Syntax không hợp lệ: ${path.relative(env.backendRoot, file)}\n${error.stack || error.message}`); }
    }
    console.log(`[Syntax] PASS ${danhSach.length} file JavaScript.`);
}

if (require.main === module) { try { chay(); } catch (error) { console.error('[Syntax] FAIL:', error.message); process.exitCode = 1; } }

module.exports = { lietKeJs, chay };