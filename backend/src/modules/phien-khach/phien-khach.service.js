'use strict';

const crypto = require('node:crypto');
const env = require('../../config/env');
const repository = require('./phien-khach.repository');

function bamSha256(value) {
    return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function taoToken() {
    return crypto.randomBytes(32).toString('base64url');
}

function taoHetHanLuc() {
    return new Date(Date.now() + env.baoMat.guestSessionTtlMs);
}

function bamUserAgent(userAgent) {
    if (!userAgent) { return null; }
    return bamSha256(userAgent);
}

async function layHoacTao({ token = null, diaChiIp = null, userAgent = null } = {}) {
    const hetHanLuc = taoHetHanLuc();
    if (token) {
        const phienKhach = await repository.timVaCham(bamSha256(token), {
            diaChiIp,
            hetHanLuc
        });
        if (phienKhach) {
            return {
                phienKhach,
                token: null,
                taoMoi: false
            };
        }
    }
    const tokenMoi = taoToken();
    const phienKhach = await repository.tao({
        tokenHash: bamSha256(tokenMoi),
        diaChiIp,
        userAgentHash: bamUserAgent(userAgent),
        hetHanLuc,
        metadata: {}
    });
    return {
        phienKhach,
        token: tokenMoi,
        taoMoi: true
    };
}

module.exports = {
    layHoacTao
};