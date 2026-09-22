'use strict';

const fs = require('node:fs');
const path = require('node:path');
const env = require('../../config/env');

function layTempDir() {
    const root = path.isAbsolute(env.storage.root) ? env.storage.root : path.resolve(env.backendRoot, env.storage.root);
    return path.resolve(root, env.storage.tempDir);
}

const TEMP_DIR = layTempDir();

function parseSoNguyenDuong(value, ten) {
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number <= 0) { throw new TypeError(`${ten} phải là số nguyên dương.`); }
    return number;
}

function namTrongTempDir(duongDan) {
    if (!duongDan) { return false; }
    const absolute = path.resolve(duongDan);
    const relative = path.relative(TEMP_DIR, absolute);
    return Boolean(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

async function layDanhSachTepTam() {
    await fs.promises.mkdir(TEMP_DIR, { recursive: true });
    return fs.promises.readdir(TEMP_DIR, { withFileTypes: true });
}

async function xoaDuongDanTam(duongDan) {
    if (!namTrongTempDir(duongDan)) { return false; }
    await fs.promises.rm(duongDan, { recursive: true, force: true });
    return true;
}

async function donTepTamQuaHan(options = {}) {
    const quaHanMs = parseSoNguyenDuong(options.quaHanMs ?? env.storage.tempMaxAgeMs, 'Thời gian quá hạn');
    const thoiDiem = options.thoiDiem instanceof Date ? options.thoiDiem : new Date();
    if (Number.isNaN(thoiDiem.getTime())) { throw new TypeError('Thời điểm dọn tệp tạm không hợp lệ.'); }
    const danhSach = await layDanhSachTepTam();
    const ketQua = {
        tempDir: TEMP_DIR,
        tongSoMuc: danhSach.length,
        daXoa: 0,
        boQua: 0,
        loi: 0
    };
    for (const item of danhSach) {
        const duongDan = path.join(TEMP_DIR, item.name);
        try {
            const stat = await fs.promises.stat(duongDan);
            const mocThoiGian = Math.max(stat.mtimeMs || 0, stat.ctimeMs || 0);
            if (thoiDiem.getTime() - mocThoiGian < quaHanMs) {
                ketQua.boQua += 1;
                continue;
            }
            const daXoa = await xoaDuongDanTam(duongDan);
            if (daXoa) { ketQua.daXoa += 1; }
        } catch (error) {
            ketQua.loi += 1;
            console.error(`[TempCleaner] Không thể xử lý "${duongDan}":`, error);
        }
    }
    return ketQua;
}

function taoTempCleaner(options = {}) {
    const enabled = options.enabled ?? env.storage.tempCleanerEnabled;
    const quaHanMs = parseSoNguyenDuong(options.quaHanMs ?? env.storage.tempMaxAgeMs, 'Thời gian quá hạn');
    const chuKyMs = parseSoNguyenDuong(options.chuKyMs ?? env.storage.tempCleanIntervalMs, 'Chu kỳ dọn');
    let timer = null;
    let dangChay = false;
    async function chay() {
        if (!enabled || dangChay) { return null; }
        dangChay = true;
        try {
            return await donTepTamQuaHan({ quaHanMs });
        } finally { dangChay = false; }
    }
    function bat() {
        if (!enabled || timer) { return timer; }
        timer = setInterval(() => {
            void chay().then((ketQua) => {
                if (ketQua?.daXoa || ketQua?.loi) { console.log('[TempCleaner]', ketQua); }
            }).catch((error) => {
                console.error('[TempCleaner] Dọn tệp tạm thất bại:', error);
            });
        }, chuKyMs);
        timer.unref?.();
        return timer;
    }
    function dung() {
        if (!timer) { return false; }
        clearInterval(timer);
        timer = null;
        return true;
    }
    return Object.freeze({
        chay,
        bat,
        dung,
        dangBat: () => Boolean(timer)
    });
}

module.exports = {
    TEMP_DIR,
    namTrongTempDir,
    xoaDuongDanTam,
    donTepTamQuaHan,
    taoTempCleaner
};