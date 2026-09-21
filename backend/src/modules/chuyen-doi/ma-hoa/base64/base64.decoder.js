'use strict';

const MAX_OUTPUT_BYTES_MAC_DINH = 256 * 1024 * 1024;

function docChuoi(value) { if (Buffer.isBuffer(value)) { return value.toString('ascii'); } if (typeof value === 'string') { return value; } throw new TypeError('Dữ liệu Base64 decode phải là Buffer hoặc string.'); }

function tachDataUri(text) {
    const match = text.match(/^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,([\s\S]*)$/i);
    if (!match) { return { text, mimeType: null, dataUri: false }; }
    return { text: match[2], mimeType: match[1] || 'application/octet-stream', dataUri: true };
}

function chuanHoaBase64(value, options = {}) {
    const raw = docChuoi(value).trim();
    const dataUri = tachDataUri(raw);
    let text = options.choPhepKhoangTrang === false ? dataUri.text : dataUri.text.replace(/\s+/g, '');
    const urlSafe = options.urlSafe === true || /[-_]/.test(text);
    if (!text) { return { text: '', mimeType: dataUri.mimeType, dataUri: dataUri.dataUri, urlSafe }; }
    if (urlSafe) { text = text.replaceAll('-', '+').replaceAll('_', '/'); }
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(text)) { throw new TypeError('Chuỗi Base64 chứa ký tự không hợp lệ.'); }
    const firstPadding = text.indexOf('=');
    if (firstPadding >= 0 && firstPadding < text.length - 2) { throw new TypeError('Base64 padding không hợp lệ.'); }
    const khongPadding = text.replace(/=+$/g, '');
    if (khongPadding.length % 4 === 1) { throw new TypeError('Độ dài Base64 không hợp lệ.'); }
    text = khongPadding.padEnd(Math.ceil(khongPadding.length / 4) * 4, '=');
    return { text, mimeType: dataUri.mimeType, dataUri: dataUri.dataUri, urlSafe };
}

function uocLuongKichThuoc(text) { if (!text) { return 0; } const padding = text.endsWith('==') ? 2 : text.endsWith('=') ? 1 : 0; return Math.floor(text.length * 3 / 4) - padding; }

function decode(value, options = {}) {
    const normalized = chuanHoaBase64(value, options);
    const maxOutputBytes = Number(options.maxOutputBytes || MAX_OUTPUT_BYTES_MAC_DINH);
    if (!Number.isSafeInteger(maxOutputBytes) || maxOutputBytes <= 0) { throw new TypeError('maxOutputBytes phải là số nguyên dương.'); }
    const estimated = uocLuongKichThuoc(normalized.text);
    if (estimated > maxOutputBytes) { throw new RangeError(`Dữ liệu sau decode vượt ${maxOutputBytes} byte.`); }
    const buffer = Buffer.from(normalized.text, 'base64');
    if (buffer.length > maxOutputBytes) { throw new RangeError(`Dữ liệu sau decode vượt ${maxOutputBytes} byte.`); }
    const canonical = buffer.toString('base64').replace(/=+$/g, '');
    const inputCanonical = normalized.text.replace(/=+$/g, '');
    if (canonical !== inputCanonical) { throw new TypeError('Chuỗi Base64 không hợp lệ hoặc không canonical.'); }
    return { buffer, kichThuocBytes: buffer.length, metadata: { mimeTypeDataUri: normalized.mimeType, dataUri: normalized.dataUri, urlSafe: normalized.urlSafe }, thongKe: { kichThuocNguonBytes: Buffer.byteLength(docChuoi(value), 'ascii'), kichThuocDichBytes: buffer.length } };
}

module.exports = {
    MAX_OUTPUT_BYTES_MAC_DINH,
    chuanHoaBase64,
    decode
};