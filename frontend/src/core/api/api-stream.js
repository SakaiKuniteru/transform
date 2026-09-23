'use strict';
const { pipeline } = require('node:stream/promises');
const backendClient = require('./backend-client');
const { ApiError } = require('./api-error');
const CAC_HEADER_CHUYEN_TIEP = Object.freeze([ 'content-type', 'content-length', 'content-disposition', 'accept-ranges', 'content-range', 'etag', 'last-modified', 'cache-control' ]);

function layHeader(headers, ten) {
    if (!headers) { return null; }
    if (typeof headers.get === 'function') { return headers.get(ten) || null; }
    return headers[ten] || headers[String(ten).toLowerCase()] || null;
}

function chuyenTiepHeaders(headers, res) {
    for (const ten of CAC_HEADER_CHUYEN_TIEP) { const giaTri = layHeader(headers, ten); if (giaTri !== null && giaTri !== undefined) { res.setHeader(ten, giaTri); } }
}

async function layStream(options = {}) {
    const response = await backendClient.thucThiRaw({ ...options, responseType: 'stream' });
    if (!response.data || typeof response.data.pipe !== 'function') { throw new ApiError('Backend không trả về stream hợp lệ.', { statusCode: 502, code: 'BACKEND_STREAM_KHONG_HOP_LE', requestId: layHeader(response.headers, 'x-request-id') }); }
    return response;
}

async function chuyenStream(response, res) {
    if (!response?.data || typeof response.data.pipe !== 'function') { throw new TypeError('Response stream không hợp lệ.'); }
    chuyenTiepHeaders(response.headers, res);
    res.status(response.status || 200);
    await pipeline(response.data, res);
}

async function chuyenStreamTuBackend(options, res) {
    const response = await layStream(options);
    await chuyenStream(response, res);
}

module.exports = { CAC_HEADER_CHUYEN_TIEP, layStream, chuyenTiepHeaders, chuyenStream, chuyenStreamTuBackend };