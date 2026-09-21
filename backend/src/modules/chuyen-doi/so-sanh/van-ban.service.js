'use strict';

const SO_O_LCS_TOI_DA = 2000000;

function chuanHoa(value, options = {}) {
    let text = String(value ?? '').replace(/\r\n?/g, '\n');
    if (options.trim !== false) { text = text.trim(); }
    if (options.chuanHoaKhoangTrang === true) { text = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n'); }
    if (options.phanBietHoaThuong === false) { text = text.toLocaleLowerCase(options.locale || 'vi'); }
    return text;
}

function tachTu(value) { return String(value || '').match(/[\p{L}\p{N}_]+/gu) || []; }

function tanSuat(tokens) { const map = new Map(); for (const token of tokens) { map.set(token, (map.get(token) || 0) + 1); } return map; }

function cosine(left, right) {
    const a = tanSuat(left);
    const b = tanSuat(right);
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (const value of a.values()) { normA += value * value; }
    for (const value of b.values()) { normB += value * value; }
    for (const [key, value] of a) { dot += value * (b.get(key) || 0); }
    if (!normA && !normB) { return 1; }
    if (!normA || !normB) { return 0; }
    return dot / Math.sqrt(normA * normB);
}

function taoDiffDong(leftText, rightText, options = {}) {
    const left = leftText.split('\n');
    const right = rightText.split('\n');
    const soO = (left.length + 1) * (right.length + 1);
    const maxCells = Number(options.maxLcsCells || SO_O_LCS_TOI_DA);
    if (soO > maxCells) { return { chiTietBiBoQua: true, lyDo: `LCS cần ${soO} ô, vượt giới hạn ${maxCells}.`, danhSach: [] }; }
    const columns = right.length + 1;
    const table = new Uint32Array((left.length + 1) * columns);
    for (let i = 1; i <= left.length; i += 1) {
        for (let j = 1; j <= right.length; j += 1) {
            const index = i * columns + j;
            table[index] = left[i - 1] === right[j - 1] ? table[(i - 1) * columns + j - 1] + 1 : Math.max(table[(i - 1) * columns + j], table[i * columns + j - 1]);
        }
    }
    const reversed = [];
    let i = left.length;
    let j = right.length;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && left[i - 1] === right[j - 1]) { reversed.push({ loai: 'GIONG', noiDung: left[i - 1], dongTrai: i, dongPhai: j }); i -= 1; j -= 1; }
        else if (j > 0 && (i === 0 || table[i * columns + j - 1] >= table[(i - 1) * columns + j])) { reversed.push({ loai: 'THEM', noiDung: right[j - 1], dongTrai: null, dongPhai: j }); j -= 1; }
        else { reversed.push({ loai: 'XOA', noiDung: left[i - 1], dongTrai: i, dongPhai: null }); i -= 1; }
    }
    return { chiTietBiBoQua: false, lyDo: null, danhSach: reversed.reverse() };
}

function soSanh(leftValue, rightValue, options = {}) {
    const leftGoc = String(leftValue ?? '');
    const rightGoc = String(rightValue ?? '');
    const left = chuanHoa(leftGoc, options);
    const right = chuanHoa(rightGoc, options);
    const tokensLeft = tachTu(left);
    const tokensRight = tachTu(right);
    const diff = options.chiTiet === false ? { chiTietBiBoQua: true, lyDo: 'Đã tắt chi tiết diff.', danhSach: [] } : taoDiffDong(left, right, options);
    const them = diff.danhSach.filter((item) => item.loai === 'THEM').length;
    const xoa = diff.danhSach.filter((item) => item.loai === 'XOA').length;
    return {
        giongHoanToan: leftGoc === rightGoc,
        giongSauChuanHoa: left === right,
        doTuongDong: cosine(tokensLeft, tokensRight),
        thongKe: {
            soKyTuTrai: left.length,
            soKyTuPhai: right.length,
            soTuTrai: tokensLeft.length,
            soTuPhai: tokensRight.length,
            soDongTrai: left ? left.split('\n').length : 0,
            soDongPhai: right ? right.split('\n').length : 0,
            soDongThem: them,
            soDongXoa: xoa
        },
        diff
    };
}

module.exports = {
    SO_O_LCS_TOI_DA,
    chuanHoa,
    tachTu,
    cosine,
    taoDiffDong,
    soSanh
};