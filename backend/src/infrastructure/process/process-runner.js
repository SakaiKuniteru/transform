'use strict';

const { spawn } = require('node:child_process');
const env = require('../../config/env');
const processCleanup = require('./process-cleanup');
const {
    loiKhongTimThayCongCu,
    loiKhoiDongThatBai,
    loiQuaThoiGian,
    loiVuotBuffer,
    loiBiHuy,
    loiThoatBatThuong
} = require('./process-error');

const CONG_CU = Object.freeze({
    LIBREOFFICE: 'libreoffice',
    PANDOC: 'pandoc',
    TESSERACT: 'tesseract',
    SEVENZIP: 'sevenzip',
    PDFTOTEXT: 'pdftotext',
    PDFTOPPM: 'pdftoppm',
    QPDF: 'qpdf',
    GHOSTSCRIPT: 'ghostscript'
});

const DANH_SACH_CONG_CU = Object.freeze(Object.values(CONG_CU));

function batBuocCommand(value) {
    const command = String(value || '').trim();
    if (!command) { throw new TypeError('Command không được để trống.'); }
    return command;
}

function chuanHoaArgs(value = []) {
    if (!Array.isArray(value)) { throw new TypeError('Process args phải là array.'); }
    return value.map((item) => {
        if (['string', 'number', 'bigint', 'boolean'].includes(typeof item)) { return String(item); }
        throw new TypeError('Mỗi process argument phải là string, number, bigint hoặc boolean.');
    });
}

function chuanHoaSoNguyenDuong(value, ten, macDinh) {
    const number = value === undefined || value === null ? macDinh : Number(value);
    if (!Number.isSafeInteger(number) || number <= 0) { throw new TypeError(`${ten} phải là số nguyên dương.`); }
    return number;
}

function chuanHoaExitCodes(value = [0]) {
    if (!Array.isArray(value) || !value.length) { throw new TypeError('Danh sách exit code hợp lệ không được rỗng.'); }
    const ketQua = [...new Set(value.map(Number))];
    if (ketQua.some((item) => !Number.isSafeInteger(item))) { throw new TypeError('Exit code hợp lệ phải là số nguyên.'); }
    return ketQua;
}

function chuanHoaEncoding(value) {
    if (value === null || value === false) { return null; }
    const encoding = String(value || 'utf8').trim();
    if (!Buffer.isEncoding(encoding)) { throw new TypeError(`Encoding "${encoding}" không hợp lệ.`); }
    return encoding;
}

function chuanHoaEnv(value = null) {
    if (value === null || value === undefined) { return process.env; }
    if (!value || typeof value !== 'object' || Array.isArray(value)) { throw new TypeError('Process env phải là object.'); }
    const result = { ...process.env };
    for (const [key, item] of Object.entries(value)) {
        if (item === undefined || item === null) {
            delete result[key];
            continue;
        }
        result[key] = String(item);
    }
    return result;
}

function chuanHoaStdin(value) {
    if (value === undefined || value === null) { return null; }
    if (Buffer.isBuffer(value)) { return value; }
    if (value instanceof Uint8Array) { return Buffer.from(value); }
    if (typeof value === 'string') { return Buffer.from(value); }
    throw new TypeError('Process stdin chỉ hỗ trợ string, Buffer hoặc Uint8Array.');
}

function chuyenOutput(chunks, encoding) {
    const buffer = Buffer.concat(chunks);
    return encoding === null ? buffer : buffer.toString(encoding);
}

function layLenhCongCu(tenCongCu) {
    const key = String(tenCongCu || '').trim().toLowerCase();
    if (!DANH_SACH_CONG_CU.includes(key)) { throw new TypeError(`Công cụ "${tenCongCu}" không hợp lệ.`); }
    const command = env.congCu[key];
    if (!command) { throw new TypeError(`Công cụ "${key}" chưa được cấu hình.`); }
    return command;
}

function chayProcess(command, args = [], options = {}) {
    const lenh = batBuocCommand(command);
    const thamSo = chuanHoaArgs(args);
    const timeoutMs = chuanHoaSoNguyenDuong(options.timeoutMs, 'Process timeout', env.congCu.defaultTimeoutMs);
    const maxBufferBytes = chuanHoaSoNguyenDuong(options.maxBufferBytes, 'Process max buffer', env.congCu.maxBufferBytes);
    const exitCodes = chuanHoaExitCodes(options.exitCodes || [0]);
    const encoding = chuanHoaEncoding(options.encoding);
    const stdin = chuanHoaStdin(options.stdin);
    const signal = options.signal || null;
    if (signal && typeof signal.addEventListener !== 'function') { throw new TypeError('Process signal phải là AbortSignal.'); }
    if (signal?.aborted) { return Promise.reject(loiBiHuy(lenh)); }
    return new Promise((resolve, reject) => {
        const batDau = Date.now();
        const stdoutChunks = [];
        const stderrChunks = [];
        let tongBufferBytes = 0;
        let daHoanTat = false;
        let lyDoKetThuc = null;
        let child;
        let timer = null;
        const detached = process.platform !== 'win32';
        const cleanupListeners = () => {
            clearTimeout(timer);
            if (signal) { signal.removeEventListener('abort', onAbort); }
            processCleanup.huyDangKyProcess(child);
        };
        const hoanTatLoi = (error) => {
            if (daHoanTat) { return; }
            daHoanTat = true;
            cleanupListeners();
            reject(error);
        };
        const datLyDoKetThuc = (error) => {
            if (lyDoKetThuc) { return; }
            lyDoKetThuc = error;
            void processCleanup.ketThucProcess(child);
        };
        const themChunk = (danhSach, chunk) => {
            if (lyDoKetThuc || daHoanTat) { return; }
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            if (tongBufferBytes + buffer.length > maxBufferBytes) {
                datLyDoKetThuc(loiVuotBuffer(lenh, maxBufferBytes));
                return;
            }
            tongBufferBytes += buffer.length;
            danhSach.push(buffer);
        };
        const onAbort = () => datLyDoKetThuc(loiBiHuy(lenh));
        try {
            child = spawn(lenh, thamSo, {
                cwd: options.cwd || undefined,
                env: chuanHoaEnv(options.env),
                shell: false,
                windowsHide: true,
                detached,
                stdio: ['pipe', 'pipe', 'pipe']
            });
        } catch (error) {
            hoanTatLoi(error?.code === 'ENOENT' ? loiKhongTimThayCongCu(lenh, error) : loiKhoiDongThatBai(lenh, error));
            return;
        }
        processCleanup.danhDauProcessGroup(child, detached);
        processCleanup.dangKyProcess(child);
        child.stdout.on('data', (chunk) => themChunk(stdoutChunks, chunk));
        child.stderr.on('data', (chunk) => themChunk(stderrChunks, chunk));
        child.stdin.on('error', () => {});
        child.once('error', (error) => {
            if (daHoanTat) { return; }
            hoanTatLoi(error?.code === 'ENOENT' ? loiKhongTimThayCongCu(lenh, error) : loiKhoiDongThatBai(lenh, error));
        });
        child.once('close', (exitCode, signalName) => {
            if (daHoanTat) { return; }
            daHoanTat = true;
            cleanupListeners();
            const stdout = chuyenOutput(stdoutChunks, encoding);
            const stderr = chuyenOutput(stderrChunks, encoding);
            const durationMs = Date.now() - batDau;
            if (lyDoKetThuc) {
                lyDoKetThuc.stdout = Buffer.isBuffer(stdout) ? stdout.toString('utf8') : stdout;
                lyDoKetThuc.stderr = Buffer.isBuffer(stderr) ? stderr.toString('utf8') : stderr;
                lyDoKetThuc.exitCode = exitCode;
                lyDoKetThuc.signal = signalName;
                reject(lyDoKetThuc);
                return;
            }
            if (!exitCodes.includes(exitCode)) {
                reject(loiThoatBatThuong(lenh, exitCode, signalName, stdout, stderr));
                return;
            }
            resolve({
                command: lenh,
                args: thamSo,
                exitCode,
                signal: signalName,
                stdout,
                stderr,
                durationMs
            });
        });
        timer = setTimeout(() => datLyDoKetThuc(loiQuaThoiGian(lenh, timeoutMs)), timeoutMs);
        if (signal) { signal.addEventListener('abort', onAbort, { once: true }); }
        if (stdin !== null) { child.stdin.end(stdin); } else { child.stdin.end(); }
    });
}

function chayCongCu(tenCongCu, args = [], options = {}) { return chayProcess(layLenhCongCu(tenCongCu), args, options); }

async function kiemTraCommand(command, args = ['--version'], options = {}) {
    const ketQua = await chayProcess(command, args, {
        ...options,
        timeoutMs: options.timeoutMs || 10000,
        maxBufferBytes: options.maxBufferBytes || 1048576
    });
    return {
        available: true,
        command: ketQua.command,
        exitCode: ketQua.exitCode,
        version: String(ketQua.stdout || ketQua.stderr || '').trim().split(/\r?\n/)[0] || null,
        durationMs: ketQua.durationMs
    };
}

async function kiemTraCongCu(tenCongCu, args = ['--version'], options = {}) { return kiemTraCommand(layLenhCongCu(tenCongCu), args, options); }

module.exports = {
    CONG_CU,
    DANH_SACH_CONG_CU,
    layLenhCongCu,
    chayProcess,
    chayCongCu,
    kiemTraCommand,
    kiemTraCongCu
};