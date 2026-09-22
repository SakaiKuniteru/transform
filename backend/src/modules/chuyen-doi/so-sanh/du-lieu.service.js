'use strict';

const MAX_DEPTH_MAC_DINH = 100;
const MAX_DIFFERENCES_MAC_DINH = 10000;

function parseNeuCan(value) { if (typeof value !== 'string') { return value; } try { return JSON.parse(value); } catch { return value; } }

function escapeJsonPointer(value) { return String(value).replaceAll('~', '~0').replaceAll('/', '~1'); }

function taoIgnoreSet(options = {}) { return new Set((options.boQuaDuongDan || []).map((item) => String(item))); }

function soBangNhau(left, right, options = {}) {
    if (typeof left === 'number' && typeof right === 'number' && Number.isFinite(left) && Number.isFinite(right)) {
        const tolerance = Number(options.saiSoSo || 0);
        return Math.abs(left - right) <= tolerance;
    }
    if (options.phanBietHoaThuong === false && typeof left === 'string' && typeof right === 'string') { return left.toLocaleLowerCase() === right.toLocaleLowerCase(); }
    return Object.is(left, right);
}

function soSanh(leftValue, rightValue, options = {}) {
    const left = parseNeuCan(leftValue);
    const right = parseNeuCan(rightValue);
    const maxDepth = Number(options.maxDepth || MAX_DEPTH_MAC_DINH);
    const maxDifferences = Number(options.maxDifferences || MAX_DIFFERENCES_MAC_DINH);
    const ignore = taoIgnoreSet(options);
    const differences = [];
    let biCat = false;
    function add(item) {
        if (differences.length >= maxDifferences) { biCat = true; return false; }
        differences.push(item);
        return true;
    }
    function walk(a, b, path, depth) {
        if (biCat || ignore.has(path)) { return; }
        if (depth > maxDepth) { add({ loai: 'VUOT_DO_SAU', path, trai: null, phai: null }); return; }
        if (soBangNhau(a, b, options)) { return; }
        const aArray = Array.isArray(a);
        const bArray = Array.isArray(b);
        if (aArray || bArray) {
            if (!aArray || !bArray) { add({ loai: 'THAY_DOI_KIEU', path, trai: a, phai: b }); return; }
            const max = Math.max(a.length, b.length);
            for (let index = 0; index < max; index += 1) {
                const childPath = `${path}/${index}`;
                if (index >= a.length) { if (!add({ loai: 'THEM', path: childPath, trai: undefined, phai: b[index] })) { return; } }
                else if (index >= b.length) { if (!add({ loai: 'XOA', path: childPath, trai: a[index], phai: undefined })) { return; } }
                else { walk(a[index], b[index], childPath, depth + 1); }
            }
            return;
        }
        const aObject = a && typeof a === 'object';
        const bObject = b && typeof b === 'object';
        if (aObject || bObject) {
            if (!aObject || !bObject) { add({ loai: 'THAY_DOI_KIEU', path, trai: a, phai: b }); return; }
            const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
            for (const key of keys) {
                const childPath = `${path}/${escapeJsonPointer(key)}`;
                if (!Object.prototype.hasOwnProperty.call(a, key)) { if (!add({ loai: 'THEM', path: childPath, trai: undefined, phai: b[key] })) { return; } }
                else if (!Object.prototype.hasOwnProperty.call(b, key)) { if (!add({ loai: 'XOA', path: childPath, trai: a[key], phai: undefined })) { return; } }
                else { walk(a[key], b[key], childPath, depth + 1); }
            }
            return;
        }
        add({ loai: 'THAY_DOI', path, trai: a, phai: b });
    }
    walk(left, right, '', 0);
    return {
        giongNhau: differences.length === 0 && !biCat,
        soKhacBiet: differences.length,
        biCat,
        differences
    };
}

module.exports = {
    MAX_DEPTH_MAC_DINH,
    MAX_DIFFERENCES_MAC_DINH,
    parseNeuCan,
    soSanh
};