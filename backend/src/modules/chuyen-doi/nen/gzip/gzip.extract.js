'use strict';

const path = require('node:path');
const zlib = require('node:zlib');
const { promisify } = require('node:util');
const { DINH_DANG } = require('../../../../constants/dinh-dang-tep');
const MA_LOI = require('../../../../constants/ma-loi');
const { taoLoiTheoStatus: taoLoi } = require('../../../../utils/loi');
const dinhDangService = require('../../nhan-dien/dinh-dang.service');

const gunzipAsync = promisify(zlib.gunzip);
const MAX_OUTPUT_BYTES_MAC_DINH = 536870912;
const MAX_COMPRESSION_RATIO_MAC_DINH = 200;

function batBuocGzip(buffer) { if (!Buffer.isBuffer(buffer) || buffer.length < 3) { throw taoLoi(422, 'Dữ liệu GZIP không hợp lệ.', MA_LOI.TEP_BI_HONG); } if (buffer[0] !== 0x1f || buffer[1] !== 0x8b || buffer[2] !== 0x08) { throw taoLoi(415, 'Tệp không có signature GZIP hợp lệ.', MA_LOI.TEP_DINH_DANG_KHONG_HO_TRO); } return buffer; }

function layTenTepSauGiaiNen(value) { const ten = path.basename(String(value || 'output').trim() || 'output'); return /\.(?:gz|gzip)$/i.test(ten) ? ten.replace(/\.(?:gz|gzip)$/i, '') || 'output' : ten; }

async function giaiNen(buffer, options = {}) {
    const input = batBuocGzip(buffer);
    const maxOutputBytes = Number(options.maxOutputBytes || MAX_OUTPUT_BYTES_MAC_DINH);
    const maxCompressionRatio = Number(options.maxCompressionRatio || MAX_COMPRESSION_RATIO_MAC_DINH);
    if (!Number.isFinite(maxOutputBytes) || maxOutputBytes <= 0) { throw new TypeError('maxOutputBytes phải là số dương.'); }
    if (!Number.isFinite(maxCompressionRatio) || maxCompressionRatio <= 0) { throw new TypeError('maxCompressionRatio phải là số dương.'); }
    let output;
    try { output = await gunzipAsync(input, { maxOutputLength: maxOutputBytes }); } catch (error) {
        if (String(error?.code || '').includes('BUFFER') || /output length|larger than/i.test(String(error?.message || ''))) { throw taoLoi(413, 'Dữ liệu sau giải nén vượt giới hạn cho phép.', MA_LOI.TEP_VUOT_KICH_THUOC); }
        throw taoLoi(422, 'Không thể giải nén dữ liệu GZIP.', MA_LOI.TEP_BI_HONG, null, { cause: error });
    }
    if (output.length > maxOutputBytes) { throw taoLoi(413, 'Dữ liệu sau giải nén vượt giới hạn cho phép.', MA_LOI.TEP_VUOT_KICH_THUOC); }
    const ratio = input.length > 0 ? output.length / input.length : Infinity;
    if (ratio > maxCompressionRatio) { throw taoLoi(413, 'Tỷ lệ giải nén GZIP vượt giới hạn an toàn.', MA_LOI.TEP_VUOT_KICH_THUOC); }
    const tenTep = layTenTepSauGiaiNen(options.tenTepNguon);
    const nhanDien = dinhDangService.nhanDienTuBuffer(output, { tenTep, mimeType: 'application/octet-stream', coToanBoBuffer: true });
    return { buffer: output, dinhDang: nhanDien.dinhDang || DINH_DANG.TXT, mimeType: nhanDien.mimeType || 'application/octet-stream', kichThuocBytes: output.length, metadata: { tenTep, nhanDien }, thongKe: { kichThuocNenBytes: input.length, kichThuocGiaiNenBytes: output.length, tiLeGiaiNen: ratio } };
}

module.exports = {
    MAX_OUTPUT_BYTES_MAC_DINH,
    MAX_COMPRESSION_RATIO_MAC_DINH,
    giaiNen
};