'use strict';

const GIOI_HAN_MAC_DINH = Object.freeze({
    maxBytes: 16 * 1024 * 1024,
    maxDepth: 100,
    maxNodes: 1000000,
    maxArrayItems: 200000,
    maxObjectKeys: 100000,
    maxStringLength: 8 * 1024 * 1024,
    maxKeyLength: 1000
});

function chuanHoaGioiHan(options = {}) {
    const result = {};
    for (const [key, macDinh] of Object.entries(GIOI_HAN_MAC_DINH)) {
        const value = options[key] === undefined || options[key] === null ? macDinh : Number(options[key]);
        if (!Number.isSafeInteger(value) || value <= 0) { throw new TypeError(`${key} phải là số nguyên dương.`); }
        result[key] = value;
    }
    return Object.freeze(result);
}

function kiemTraKichThuoc(value, options = {}) {
    const limits = chuanHoaGioiHan(options);
    const bytes = Buffer.isBuffer(value) ? value.length : Buffer.byteLength(String(value ?? ''), 'utf8');
    if (bytes > limits.maxBytes) { throw new RangeError(`JSON vượt giới hạn ${limits.maxBytes} byte.`); }
    return bytes;
}

function kiemTraCauTruc(value, options = {}) {
    const limits = chuanHoaGioiHan(options);
    const thongKe = { soNode: 0, soObject: 0, soArray: 0, soChuoi: 0, soSo: 0, soBoolean: 0, soNull: 0, doSauLonNhat: 0 };
    function walk(item, depth) {
        if (depth > limits.maxDepth) { throw new RangeError(`JSON vượt độ sâu tối đa ${limits.maxDepth}.`); }
        thongKe.soNode += 1;
        thongKe.doSauLonNhat = Math.max(thongKe.doSauLonNhat, depth);
        if (thongKe.soNode > limits.maxNodes) { throw new RangeError(`JSON vượt số node tối đa ${limits.maxNodes}.`); }
        if (item === null) { thongKe.soNull += 1; return; }
        if (typeof item === 'string') {
            if (item.length > limits.maxStringLength) { throw new RangeError(`Chuỗi JSON vượt ${limits.maxStringLength} ký tự.`); }
            thongKe.soChuoi += 1;
            return;
        }
        if (typeof item === 'number') { if (!Number.isFinite(item)) { throw new TypeError('JSON chứa số không hữu hạn.'); } thongKe.soSo += 1; return; }
        if (typeof item === 'boolean') { thongKe.soBoolean += 1; return; }
        if (Array.isArray(item)) {
            if (item.length > limits.maxArrayItems) { throw new RangeError(`Array JSON vượt ${limits.maxArrayItems} phần tử.`); }
            thongKe.soArray += 1;
            for (const child of item) { walk(child, depth + 1); }
            return;
        }
        if (typeof item === 'object') {
            const keys = Object.keys(item);
            if (keys.length > limits.maxObjectKeys) { throw new RangeError(`Object JSON vượt ${limits.maxObjectKeys} thuộc tính.`); }
            thongKe.soObject += 1;
            for (const key of keys) {
                if (key.length > limits.maxKeyLength) { throw new RangeError(`Tên thuộc tính JSON vượt ${limits.maxKeyLength} ký tự.`); }
                walk(item[key], depth + 1);
            }
            return;
        }
        throw new TypeError(`JSON chứa kiểu dữ liệu không hợp lệ: ${typeof item}.`);
    }
    walk(value, 0);
    return Object.freeze(thongKe);
}

function kiemTra(value, options = {}) {
    const thongKe = kiemTraCauTruc(value, options);
    return { hopLe: true, thongKe };
}

module.exports = {
    GIOI_HAN_MAC_DINH,
    chuanHoaGioiHan,
    kiemTraKichThuoc,
    kiemTraCauTruc,
    kiemTra
};