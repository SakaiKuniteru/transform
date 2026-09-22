'use strict';

const { TextDecoder } = require('node:util');

function batDauBang(buffer, bytes) {
    if (!Buffer.isBuffer(buffer) || buffer.length < bytes.length) { return false; }
    for (let index = 0; index < bytes.length; index += 1) { if (buffer[index] !== bytes[index]) { return false; } }
    return true;
}

function laUtf8HopLe(buffer) {
    if (!Buffer.isBuffer(buffer)) { return false; }
    try {
        new TextDecoder('utf-8', { fatal: true }).decode(buffer);
        return true;
    } catch { return false; }
}

function demByteDieuKhien(buffer) {
    let tong = 0;
    for (const byte of buffer) { if (byte < 0x20 && ![0x09, 0x0A, 0x0C, 0x0D].includes(byte)) { tong += 1; } }
    return tong;
}

function nhanDienUtf16KhongBom(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 4) { return null; }
    const gioiHan = Math.min(buffer.length, 4096);
    let zeroChan = 0;
    let zeroLe = 0;
    let soChan = 0;
    let soLe = 0;
    for (let index = 0; index < gioiHan; index += 1) {
        if (index % 2 === 0) {
            soChan += 1;
            if (buffer[index] === 0) { zeroChan += 1; }
        } else {
            soLe += 1;
            if (buffer[index] === 0) { zeroLe += 1; }
        }
    }
    const tyLeChan = soChan ? zeroChan / soChan : 0;
    const tyLeLe = soLe ? zeroLe / soLe : 0;
    if (tyLeLe >= 0.3 && tyLeChan <= 0.05) { return 'utf16le'; }
    if (tyLeChan >= 0.3 && tyLeLe <= 0.05) { return 'utf16be'; }
    return null;
}

function nhanDienEncoding(buffer) {
    if (!Buffer.isBuffer(buffer)) { throw new TypeError('Dữ liệu nhận diện encoding phải là Buffer.'); }
    if (buffer.length === 0) { return { encoding: 'utf8', bom: null, coBom: false, laVanBan: true, doTinCay: 'THAP' }; }
    if (batDauBang(buffer, [0xEF, 0xBB, 0xBF])) { return { encoding: 'utf8', bom: 'UTF8', coBom: true, laVanBan: true, doTinCay: 'CAO' }; }
    if (batDauBang(buffer, [0xFF, 0xFE, 0x00, 0x00])) { return { encoding: 'utf32le', bom: 'UTF32LE', coBom: true, laVanBan: true, doTinCay: 'CAO' }; }
    if (batDauBang(buffer, [0x00, 0x00, 0xFE, 0xFF])) { return { encoding: 'utf32be', bom: 'UTF32BE', coBom: true, laVanBan: true, doTinCay: 'CAO' }; }
    if (batDauBang(buffer, [0xFF, 0xFE])) { return { encoding: 'utf16le', bom: 'UTF16LE', coBom: true, laVanBan: true, doTinCay: 'CAO' }; }
    if (batDauBang(buffer, [0xFE, 0xFF])) { return { encoding: 'utf16be', bom: 'UTF16BE', coBom: true, laVanBan: true, doTinCay: 'CAO' }; }
    const utf16 = nhanDienUtf16KhongBom(buffer);
    if (utf16) { return { encoding: utf16, bom: null, coBom: false, laVanBan: true, doTinCay: 'TRUNG_BINH' }; }
    const mau = buffer.subarray(0, Math.min(buffer.length, 65536));
    const tyLeDieuKhien = mau.length ? demByteDieuKhien(mau) / mau.length : 0;
    if (laUtf8HopLe(mau) && tyLeDieuKhien <= 0.01) {
        const ascii = mau.every((byte) => byte < 0x80);
        return { encoding: ascii ? 'ascii' : 'utf8', bom: null, coBom: false, laVanBan: true, doTinCay: ascii ? 'TRUNG_BINH' : 'CAO' };
    }
    return { encoding: null, bom: null, coBom: false, laVanBan: false, doTinCay: 'CAO' };
}

function boBom(buffer, encoding) {
    if (encoding === 'utf8' && batDauBang(buffer, [0xEF, 0xBB, 0xBF])) { return buffer.subarray(3); }
    if (encoding === 'utf16le' && batDauBang(buffer, [0xFF, 0xFE])) { return buffer.subarray(2); }
    if (encoding === 'utf16be' && batDauBang(buffer, [0xFE, 0xFF])) { return buffer.subarray(2); }
    return buffer;
}

function daoCapByte(buffer) {
    const output = Buffer.alloc(buffer.length - buffer.length % 2);
    for (let index = 0; index < output.length; index += 2) {
        output[index] = buffer[index + 1];
        output[index + 1] = buffer[index];
    }
    return output;
}

function docVanBan(buffer, encoding = null) {
    if (!Buffer.isBuffer(buffer)) { throw new TypeError('Dữ liệu văn bản phải là Buffer.'); }
    const thongTin = encoding ? { encoding: String(encoding).trim().toLowerCase() } : nhanDienEncoding(buffer);
    if (!thongTin.encoding) { throw new TypeError('Không xác định được encoding văn bản.'); }
    if (thongTin.encoding === 'utf8' || thongTin.encoding === 'ascii') { return boBom(buffer, 'utf8').toString('utf8'); }
    if (thongTin.encoding === 'utf16le') { return boBom(buffer, 'utf16le').toString('utf16le'); }
    if (thongTin.encoding === 'utf16be') { return daoCapByte(boBom(buffer, 'utf16be')).toString('utf16le'); }
    throw new TypeError(`Encoding "${thongTin.encoding}" chưa được hỗ trợ để giải mã nội dung.`);
}

module.exports = {
    laUtf8HopLe,
    nhanDienEncoding,
    docVanBan
};