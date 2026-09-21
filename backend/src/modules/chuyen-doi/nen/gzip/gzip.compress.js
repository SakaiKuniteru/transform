'use strict';

const zlib = require('node:zlib');
const { promisify } = require('node:util');
const { DINH_DANG } = require('../../../../constants/dinh-dang-tep');
const MA_LOI = require('../../../../constants/ma-loi');
const { taoLoiTheoStatus: taoLoi } = require('../../../../utils/loi');

const gzipAsync = promisify(zlib.gzip);
const MAX_INPUT_BYTES_MAC_DINH = 268435456;

function batBuocBuffer(value) { if (!Buffer.isBuffer(value)) { throw new TypeError('Dữ liệu nén GZIP phải là Buffer.'); } if (!value.length) { throw taoLoi(422, 'Không thể nén Buffer rỗng.', MA_LOI.TEP_KHONG_HOP_LE); } return value; }

function chuanHoaLevel(value) { const level = value === undefined || value === null ? zlib.constants.Z_DEFAULT_COMPRESSION : Number(value); if (!Number.isSafeInteger(level) || level < -1 || level > 9) { throw new TypeError('GZIP level phải nằm trong khoảng -1 đến 9.'); } return level; }

async function nen(buffer, options = {}) {
    const input = batBuocBuffer(buffer);
    const maxInputBytes = Number(options.maxInputBytes || MAX_INPUT_BYTES_MAC_DINH);
    if (!Number.isFinite(maxInputBytes) || maxInputBytes <= 0) { throw new TypeError('maxInputBytes phải là số dương.'); }
    if (input.length > maxInputBytes) { throw taoLoi(413, 'Tệp nguồn vượt giới hạn kích thước nén GZIP.', MA_LOI.TEP_VUOT_KICH_THUOC); }
    const level = chuanHoaLevel(options.level);
    const output = await gzipAsync(input, { level });
    return { buffer: output, dinhDang: DINH_DANG.GZIP, mimeType: 'application/gzip', kichThuocBytes: output.length, metadata: { level }, thongKe: { kichThuocNguonBytes: input.length, kichThuocDichBytes: output.length, tiLe: input.length > 0 ? output.length / input.length : null } };
}

module.exports = {
    MAX_INPUT_BYTES_MAC_DINH,
    nen
};