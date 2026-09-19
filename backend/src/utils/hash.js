'use strict';

const fs = require('node:fs');
const crypto = require('node:crypto');
const THUAT_TOAN_MAC_DINH = 'sha256';

function chuyenThanhBuffer(value) {
    if (Buffer.isBuffer(value)) { return value; }
    if (value instanceof Uint8Array) { return Buffer.from(value); }
    return Buffer.from(String(value ?? ''), 'utf8');
}

function bam(value, thuatToan = THUAT_TOAN_MAC_DINH, encoding = 'hex') {
    return crypto.createHash(thuatToan).update(chuyenThanhBuffer(value)).digest(encoding);
}

function sha256(value) { return bam(value, 'sha256', 'hex'); }

function hmac(value, secret, thuatToan = THUAT_TOAN_MAC_DINH, encoding = 'hex') {
    if (typeof secret !== 'string' && !Buffer.isBuffer(secret)) { throw new TypeError('Secret HMAC không hợp lệ.'); }
    return crypto.createHmac(thuatToan, secret).update(chuyenThanhBuffer(value)).digest(encoding);
}

function hmacSha256(value, secret) { return hmac(value, secret, 'sha256', 'hex'); }

async function bamStream(stream, thuatToan = THUAT_TOAN_MAC_DINH, encoding = 'hex') {
    if (!stream || typeof stream[Symbol.asyncIterator] !== 'function') { throw new TypeError('Stream không hợp lệ.'); }
    const hash = crypto.createHash(thuatToan);
    for await (const chunk of stream) { hash.update(chunk); }
    return hash.digest(encoding);
}

async function bamTep(duongDan, thuatToan = THUAT_TOAN_MAC_DINH, encoding = 'hex') {
    if (typeof duongDan !== 'string' || !duongDan.trim()) { throw new TypeError('Đường dẫn tệp không hợp lệ.'); }
    await fs.promises.access(duongDan, fs.constants.R_OK);
    return bamStream(fs.createReadStream(duongDan), thuatToan, encoding);
}

async function bamTepSha256(duongDan) { return bamTep(duongDan, 'sha256', 'hex'); }

function soSanhBaoMat(a, b) {
    const bufferA = chuyenThanhBuffer(a);
    const bufferB = chuyenThanhBuffer(b);
    if (bufferA.length !== bufferB.length) { return false; }
    return crypto.timingSafeEqual(bufferA, bufferB);
}

module.exports = {
    THUAT_TOAN_MAC_DINH,
    bam,
    sha256,
    hmac,
    hmacSha256,
    bamStream,
    bamTep,
    bamTepSha256,
    soSanhBaoMat
};