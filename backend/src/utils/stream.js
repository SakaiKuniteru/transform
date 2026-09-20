'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { pipeline } = require('node:stream/promises');
const env = require('../config/env');

function batBuocStream(stream) {
    if (!stream || typeof stream.on !== 'function') { throw new TypeError('Stream không hợp lệ.'); }
    return stream;
}

function batBuocGioiHan(value) {
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number <= 0) { throw new TypeError('Giới hạn byte phải là số nguyên dương.'); }
    return number;
}

async function docStreamThanhBuffer(stream, gioiHanBytes = env.congCu.maxBufferBytes) {
    batBuocStream(stream);
    const gioiHan = batBuocGioiHan(gioiHanBytes);
    const chunks = [];
    let tongKichThuoc = 0;
    for await (const chunk of stream) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        tongKichThuoc += buffer.length;
        if (tongKichThuoc > gioiHan) {
            const error = new RangeError(`Stream vượt quá giới hạn ${gioiHan} byte.`);
            error.code = 'STREAM_VUOT_GIOI_HAN';
            stream.destroy?.(error);
            throw error;
        }
        chunks.push(buffer);
    }
    return Buffer.concat(chunks, tongKichThuoc);
}

async function pipelineAnToan(...streams) {
    if (streams.length < 2) { throw new TypeError('Pipeline cần ít nhất stream nguồn và stream đích.'); }
    streams.forEach(batBuocStream);
    return pipeline(...streams);
}

async function ghiStreamRaTep(stream, duongDan, options = {}) {
    batBuocStream(stream);
    if (typeof duongDan !== 'string' || !duongDan.trim()) { throw new TypeError('Đường dẫn tệp đích không hợp lệ.'); }
    const absolute = path.resolve(duongDan);
    await fs.promises.mkdir(path.dirname(absolute), { recursive: true });
    const output = fs.createWriteStream(absolute, {
        flags: options.flags || 'w',
        mode: options.mode
    });
    try {
        await pipeline(stream, output);
        const stat = await fs.promises.stat(absolute);
        return {
            duongDan: absolute,
            kichThuocBytes: stat.size
        };
    } catch (error) {
        await fs.promises.rm(absolute, { force: true }).catch(() => {});
        throw error;
    }
}

module.exports = {
    docStreamThanhBuffer,
    pipelineAnToan,
    ghiStreamRaTep
};