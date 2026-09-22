'use strict';

const MAX_INPUT_BYTES_MAC_DINH = 256 * 1024 * 1024;

function batBuocBuffer(value) { if (!Buffer.isBuffer(value)) { throw new TypeError('Dữ liệu Base64 encode phải là Buffer.'); } return value; }

function chuanHoaLineLength(value) {
    if (value === undefined || value === null || value === 0) { return 0; }
    const length = Number(value);
    if (!Number.isSafeInteger(length) || length < 4 || length > 1000 || length % 4 !== 0) { throw new TypeError('Base64 lineLength phải là bội số của 4 từ 4 đến 1000.'); }
    return length;
}

function chenXuốngDong(value, lineLength) { if (!lineLength) { return value; } const chunks = []; for (let index = 0; index < value.length; index += lineLength) { chunks.push(value.slice(index, index + lineLength)); } return chunks.join('\n'); }

function encode(buffer, options = {}) {
    const input = batBuocBuffer(buffer);
    const maxInputBytes = Number(options.maxInputBytes || MAX_INPUT_BYTES_MAC_DINH);
    if (!Number.isSafeInteger(maxInputBytes) || maxInputBytes <= 0) { throw new TypeError('maxInputBytes phải là số nguyên dương.'); }
    if (input.length > maxInputBytes) { throw new RangeError(`Dữ liệu encode vượt ${maxInputBytes} byte.`); }
    const urlSafe = options.urlSafe === true;
    const padding = options.padding !== false;
    const lineLength = chuanHoaLineLength(options.lineLength);
    if (urlSafe && options.dataUri === true) { throw new TypeError('Data URI không dùng Base64 URL-safe.'); }
    let text = input.toString('base64');
    if (urlSafe) { text = text.replaceAll('+', '-').replaceAll('/', '_'); }
    if (!padding) { text = text.replace(/=+$/g, ''); }
    text = chenXuốngDong(text, lineLength);
    if (options.dataUri === true) { text = `data:${String(options.mimeType || 'application/octet-stream').trim()};base64,${text}`; }
    const output = Buffer.from(text, 'ascii');
    return { buffer: output, text, kichThuocBytes: output.length, metadata: { urlSafe, padding, lineLength, dataUri: options.dataUri === true }, thongKe: { kichThuocNguonBytes: input.length, kichThuocDichBytes: output.length } };
}

module.exports = {
    MAX_INPUT_BYTES_MAC_DINH,
    encode
};