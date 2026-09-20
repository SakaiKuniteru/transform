'use strict';

const fs = require('node:fs');
const path = require('node:path');
const env = require('../../config/env');

const MAC_DINH_QUA_HAN_MS = 24 * 60 * 60 * 1000;
const MAC_DINH_CHU_KY_DON_MS = 60 * 60 * 1000;

function taoLoi(message) {
    const error = new Error(message);
    error.code = 'LOI_DON_TEP_TAM';
    return error;
}

function layTempDir() {
    const root = path.isAbsolute(env.storage.root) ? env.storage.root : path.resolve(env.backendRoot, env.storage.root);
    return path.resolve(root, env.storage.tempDir);
}

const TEMP_DIR = layTempDir();

function parseSoNguyenDuong(value, macDinh, ten) {
    if (value === undefined || value === null) { return macDinh; }
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
    try {
        await fs.promises.mkdir(TEMP_DIR, { recursive: true });
        return await fs.promises.readdir(TEMP_DIR, { withFileTypes: true });
    } catch (error) {
        throw taoLoi(`Không thể đọc thư mục tạm: ${error.message}`);
    }
}

async function xoaDuongDanTam(duongDan) {
    if (!namTrongTempDir(duongDan)) { return false; }
    try {
        await fs.promises.rm(duongDan, { recursive: true, force: true });
        return true;
    } catch {
        return false;
    }
}

async function donTepTamQuaHan(options = {}) {
    const quaHanMs = parseSoNguyenDuong(options.quaHanMs, MAC_DINH_QUA_HAN_MS, 'Thời gian quá hạn');
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
            if (daXoa) {
                ketQua.daXoa += 1;
            } else {
                ketQua.loi += 1;
            }
        } catch {
            ketQua.loi += 1;
        }
    }
    return ketQua;
}

function taoTempCleaner(options = {}) {
    const quaHanMs = parseSoNguyenDuong(options.quaHanMs, MAC_DINH_QUA_HAN_MS, 'Thời gian quá hạn');
    const chuKyMs = parseSoNguyenDuong(options.chuKyMs, MAC_DINH_CHU_KY_DON_MS, 'Chu kỳ dọn');
    let timer = null;
    let dangChay = false;
    async function chay() {
        if (dangChay) { return null; }
        dangChay = true;
        try {
            return await donTepTamQuaHan({ quaHanMs });
        } finally { dangChay = false; }
    }
    function bat() {
        if (timer) { return timer; }
        timer = setInterval(() => {
            void chay().catch(() => {});
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
    MAC_DINH_QUA_HAN_MS,
    MAC_DINH_CHU_KY_DON_MS,
    namTrongTempDir,
    xoaDuongDanTam,
    donTepTamQuaHan,
    taoTempCleaner
};