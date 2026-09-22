'use strict';

const fs = require('node:fs');
const path = require('node:path');
const env = require('../../config/env');

const PROCESS_GROUP = Symbol.for('transform.process.group');
const STORAGE_ROOT = path.isAbsolute(env.storage.root) ? env.storage.root : path.resolve(env.backendRoot, env.storage.root);
const TEMP_ROOT = path.resolve(STORAGE_ROOT, env.storage.tempDir);
const processDangChay = new Set();
const duongDanTam = new Set();

function daKetThuc(child) { return !child || child.exitCode !== null || child.signalCode !== null; }

function namTrongTempRoot(value) {
    const absolute = path.resolve(value);
    const relative = path.relative(TEMP_ROOT, absolute);
    return Boolean(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

function chuanHoaPrefix(value = 'process-') {
    const prefix = String(value || 'process-').trim().replace(/[^A-Za-z0-9._-]/g, '-');
    return prefix.endsWith('-') ? prefix : `${prefix}-`;
}

function danhDauProcessGroup(child, value = true) {
    if (!child || typeof child !== 'object') { throw new TypeError('Child process không hợp lệ.'); }
    child[PROCESS_GROUP] = value === true;
    return child;
}

function dangKyProcess(child) {
    if (!child || typeof child.kill !== 'function') { throw new TypeError('Child process không hợp lệ.'); }
    processDangChay.add(child);
    child.once('close', () => { processDangChay.delete(child); });
    return child;
}

function huyDangKyProcess(child) {
    if (!child) { return false; }
    return processDangChay.delete(child);
}

function guiTinHieu(child, signal) {
    if (daKetThuc(child)) { return false; }
    try {
        if (process.platform !== 'win32' && child[PROCESS_GROUP] === true && Number.isSafeInteger(child.pid) && child.pid > 0) {
            process.kill(-child.pid, signal);
            return true;
        }
        return child.kill(signal);
    } catch {
        try { return child.kill(signal); } catch { return false; }
    }
}

function choKetThuc(child, timeoutMs) {
    if (daKetThuc(child)) { return Promise.resolve(true); }
    return new Promise((resolve) => {
        let daXong = false;
        const hoanTat = (value) => {
            if (daXong) { return; }
            daXong = true;
            clearTimeout(timer);
            child.off('close', onClose);
            resolve(value);
        };
        const onClose = () => hoanTat(true);
        const timer = setTimeout(() => hoanTat(false), timeoutMs);
        child.once('close', onClose);
    });
}

async function ketThucProcess(child, options = {}) {
    if (daKetThuc(child)) { return true; }
    const graceMs = Number.isSafeInteger(options.graceMs) && options.graceMs >= 0 ? options.graceMs : 2000;
    guiTinHieu(child, 'SIGTERM');
    if (await choKetThuc(child, graceMs)) { return true; }
    guiTinHieu(child, 'SIGKILL');
    return choKetThuc(child, 1000);
}

async function donTatCaProcess(options = {}) {
    const danhSach = Array.from(processDangChay);
    if (!danhSach.length) { return []; }
    const ketQua = await Promise.allSettled(danhSach.map((child) => ketThucProcess(child, options)));
    for (const child of danhSach) { processDangChay.delete(child); }
    return ketQua;
}

async function damBaoTempRoot() {
    await fs.promises.mkdir(TEMP_ROOT, { recursive: true });
    return TEMP_ROOT;
}

function dangKyDuongDanTam(value) {
    const absolute = path.resolve(value);
    if (!namTrongTempRoot(absolute)) { throw new TypeError('Đường dẫn tạm phải nằm trong thư mục temp của hệ thống.'); }
    duongDanTam.add(absolute);
    return absolute;
}

function huyDangKyDuongDanTam(value) {
    if (!value) { return false; }
    return duongDanTam.delete(path.resolve(value));
}

async function taoThuMucTam(prefix = 'process-') {
    await damBaoTempRoot();
    const thuMuc = await fs.promises.mkdtemp(path.join(TEMP_ROOT, chuanHoaPrefix(prefix)));
    duongDanTam.add(thuMuc);
    return thuMuc;
}

async function xoaDuongDanTam(value) {
    if (!value) { return false; }
    const absolute = path.resolve(value);
    if (!namTrongTempRoot(absolute)) { throw new TypeError('Không được xóa đường dẫn nằm ngoài thư mục temp của hệ thống.'); }
    try {
        await fs.promises.rm(absolute, { recursive: true, force: true });
        duongDanTam.delete(absolute);
        return true;
    } catch (error) {
        duongDanTam.delete(absolute);
        throw error;
    }
}

async function donTatCaDuongDanTam() {
    const danhSach = Array.from(duongDanTam).sort((a, b) => b.length - a.length);
    const ketQua = await Promise.allSettled(danhSach.map(xoaDuongDanTam));
    duongDanTam.clear();
    return ketQua;
}

async function donTatCa(options = {}) {
    const processResult = await donTatCaProcess(options);
    const tempResult = await donTatCaDuongDanTam();
    return { process: processResult, temp: tempResult };
}

function layThongKe() {
    return {
        soProcessDangChay: processDangChay.size,
        soDuongDanTam: duongDanTam.size,
        tempRoot: TEMP_ROOT
    };
}

module.exports = {
    TEMP_ROOT,
    danhDauProcessGroup,
    dangKyProcess,
    huyDangKyProcess,
    ketThucProcess,
    donTatCaProcess,
    damBaoTempRoot,
    dangKyDuongDanTam,
    huyDangKyDuongDanTam,
    taoThuMucTam,
    xoaDuongDanTam,
    donTatCaDuongDanTam,
    donTatCa,
    layThongKe
};