'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { CONG_CU, chayCongCu, kiemTraCongCu } = require('./process-runner');

const DINH_DANG_NEN = Object.freeze({ ZIP: 'zip', SEVEN_ZIP: '7z', TAR: 'tar' });
const GIOI_HAN_MAC_DINH = Object.freeze({ maxFiles: 10000, maxTotalBytes: 1073741824, maxSingleFileBytes: 268435456, maxCompressionRatio: 200 });

function chuanHoaDuongDan(value, ten) { const duongDan = String(value || '').trim(); if (!duongDan) { throw new TypeError(`${ten} không được để trống.`); } return path.resolve(duongDan); }

function parseSo(value) { const number = Number(String(value ?? '').trim()); return Number.isFinite(number) && number >= 0 ? number : 0; }

function chuanHoaGioiHan(options = {}) {
    const result = {};
    for (const [key, macDinh] of Object.entries(GIOI_HAN_MAC_DINH)) {
        const value = options[key] === undefined || options[key] === null ? macDinh : Number(options[key]);
        if (!Number.isFinite(value) || value <= 0) { throw new TypeError(`${key} phải là số dương.`); }
        result[key] = value;
    }
    return result;
}

function phanTichSlt(stdout) {
    const items = [];
    let current = {};
    const push = () => { if (current.Path) { items.push(current); } current = {}; };
    for (const line of String(stdout || '').split(/\r?\n/)) {
        if (!line.trim()) { push(); continue; }
        const index = line.indexOf(' = ');
        if (index < 0) { continue; }
        const key = line.slice(0, index).trim();
        const value = line.slice(index + 3);
        current[key] = value;
    }
    push();
    return items.map((item) => ({
        path: item.Path,
        size: parseSo(item.Size),
        packedSize: parseSo(item['Packed Size']),
        attributes: String(item.Attributes || ''),
        folder: String(item.Folder || '').trim() === '+',
        encrypted: String(item.Encrypted || '').trim() === '+',
        method: item.Method || null
    }));
}

function chuanHoaTenEntry(value) {
    const raw = String(value || '');
    if (!raw || raw.includes('\0')) { throw new Error('Tên entry trong tệp nén không hợp lệ.'); }
    const normalized = raw.replaceAll('\\', '/');
    if (normalized.startsWith('/') || normalized.startsWith('//') || /^[A-Za-z]:\//.test(normalized)) { throw new Error(`Tệp nén chứa đường dẫn tuyệt đối không an toàn: ${raw}`); }
    const parts = normalized.split('/').filter((item) => item && item !== '.');
    if (parts.some((item) => item === '..')) { throw new Error(`Tệp nén chứa path traversal: ${raw}`); }
    return parts.join('/');
}

function laSymlink(item) { const attributes = String(item.attributes || '').trim(); return /^l/i.test(attributes) || /\bL\b/.test(attributes); }

function kiemTraDanhSachEntry(items, options = {}) {
    const limits = chuanHoaGioiHan(options);
    if (items.length > limits.maxFiles) { throw new Error(`Tệp nén có ${items.length} entry, vượt giới hạn ${limits.maxFiles}.`); }
    let tongBytes = 0;
    let tongPacked = 0;
    for (const item of items) {
        item.path = chuanHoaTenEntry(item.path);
        if (!item.path) { continue; }
        if (laSymlink(item)) { throw new Error(`Tệp nén chứa symbolic link không được phép: ${item.path}`); }
        if (item.encrypted && options.choPhepMaHoa !== true) { throw new Error(`Tệp nén chứa entry mã hóa không được phép: ${item.path}`); }
        if (item.size > limits.maxSingleFileBytes) { throw new Error(`Entry "${item.path}" vượt giới hạn kích thước mỗi tệp.`); }
        tongBytes += item.size;
        tongPacked += item.packedSize;
        if (tongBytes > limits.maxTotalBytes) { throw new Error('Tổng dung lượng giải nén vượt giới hạn cho phép.'); }
        if (item.packedSize > 0 && item.size / item.packedSize > limits.maxCompressionRatio) { throw new Error(`Entry "${item.path}" có tỷ lệ nén bất thường.`); }
    }
    if (tongPacked > 0 && tongBytes / tongPacked > limits.maxCompressionRatio) { throw new Error('Tệp nén có tỷ lệ giải nén tổng thể bất thường.'); }
    return { soEntry: items.length, tongBytes, tongPackedBytes: tongPacked, limits };
}

async function kiemTra() { return kiemTraCongCu(CONG_CU.SEVENZIP, ['i']); }

async function damBaoTepTonTai(duongDan) { await fs.promises.access(duongDan, fs.constants.R_OK); }

async function lietKe(duongDanNen, options = {}) {
    const archive = chuanHoaDuongDan(duongDanNen, 'Đường dẫn tệp nén');
    await damBaoTepTonTai(archive);
    const result = await chayCongCu(CONG_CU.SEVENZIP, ['l', '-slt', '-ba', '--', archive], { signal: options.signal, timeoutMs: options.timeoutMs, maxBufferBytes: options.maxBufferBytes || 16777216 });
    const danhSach = phanTichSlt(result.stdout);
    const thongKe = kiemTraDanhSachEntry(danhSach, options);
    return { ...result, danhSach, thongKe };
}

async function kiemTraTepNen(duongDanNen, options = {}) {
    const archive = chuanHoaDuongDan(duongDanNen, 'Đường dẫn tệp nén');
    await lietKe(archive, options);
    const result = await chayCongCu(CONG_CU.SEVENZIP, ['t', '-bd', '-bb0', '--', archive], { signal: options.signal, timeoutMs: options.timeoutMs, maxBufferBytes: options.maxBufferBytes });
    return { hopLe: true, ...result };
}

async function damBaoThuMucTrong(thuMuc) {
    try {
        const entries = await fs.promises.readdir(thuMuc);
        if (entries.length) { throw new Error('Thư mục giải nén phải rỗng.'); }
    } catch (error) {
        if (error.code !== 'ENOENT') { throw error; }
        await fs.promises.mkdir(thuMuc, { recursive: true });
    }
}

async function quetSauGiaiNen(root, options = {}) {
    const limits = chuanHoaGioiHan(options);
    const rootReal = await fs.promises.realpath(root);
    let soTep = 0;
    let tongBytes = 0;
    async function walk(current) {
        for (const entry of await fs.promises.readdir(current, { withFileTypes: true })) {
            const full = path.join(current, entry.name);
            const stat = await fs.promises.lstat(full);
            if (stat.isSymbolicLink()) { throw new Error(`Kết quả giải nén chứa symbolic link: ${full}`); }
            const real = await fs.promises.realpath(full);
            if (real !== rootReal && !real.startsWith(`${rootReal}${path.sep}`)) { throw new Error(`Kết quả giải nén vượt ra ngoài thư mục đích: ${full}`); }
            if (stat.isDirectory()) { await walk(full); continue; }
            if (!stat.isFile()) { throw new Error(`Kết quả giải nén chứa loại tệp không được hỗ trợ: ${full}`); }
            soTep += 1;
            tongBytes += stat.size;
            if (soTep > limits.maxFiles) { throw new Error('Số tệp sau giải nén vượt giới hạn.'); }
            if (stat.size > limits.maxSingleFileBytes) { throw new Error(`Tệp "${entry.name}" sau giải nén vượt giới hạn kích thước.`); }
            if (tongBytes > limits.maxTotalBytes) { throw new Error('Tổng dung lượng sau giải nén vượt giới hạn.'); }
        }
    }
    await walk(root);
    return { soTep, tongBytes };
}

async function giaiNen(duongDanNen, thuMucDich, options = {}) {
    const archive = chuanHoaDuongDan(duongDanNen, 'Đường dẫn tệp nén');
    const outDir = chuanHoaDuongDan(thuMucDich, 'Thư mục giải nén');
    const thongTin = await lietKe(archive, options);
    await damBaoThuMucTrong(outDir);
    try {
        const result = await chayCongCu(CONG_CU.SEVENZIP, ['x', '-y', '-bd', '-bb0', `-o${outDir}`, '--', archive], { signal: options.signal, timeoutMs: options.timeoutMs, maxBufferBytes: options.maxBufferBytes });
        const sauGiaiNen = await quetSauGiaiNen(outDir, options);
        return { ...result, danhSach: thongTin.danhSach, thongKe: { ...thongTin.thongKe, sauGiaiNen } };
    } catch (error) {
        if (options.donDepKhiLoi !== false) { await fs.promises.rm(outDir, { recursive: true, force: true }).catch(() => {}); }
        throw error;
    }
}

async function nen(danhSachNguon, duongDanDich, dinhDang = DINH_DANG_NEN.ZIP, options = {}) {
    if (!Array.isArray(danhSachNguon) || !danhSachNguon.length) { throw new TypeError('Danh sách tệp nguồn cần nén không được rỗng.'); }
    const format = String(dinhDang || '').trim().toLowerCase();
    if (!Object.values(DINH_DANG_NEN).includes(format)) { throw new TypeError('7-Zip chỉ hỗ trợ tạo ZIP, 7Z hoặc TAR ở wrapper này.'); }
    const sources = danhSachNguon.map((item) => chuanHoaDuongDan(item, 'Đường dẫn nguồn'));
    await Promise.all(sources.map(damBaoTepTonTai));
    const output = chuanHoaDuongDan(duongDanDich, 'Đường dẫn tệp nén đích');
    await fs.promises.mkdir(path.dirname(output), { recursive: true });
    const args = ['a', `-t${format === DINH_DANG_NEN.SEVEN_ZIP ? '7z' : format}`, '-y', '-bd', '-bb0'];
    if (Number.isSafeInteger(Number(options.level)) && Number(options.level) >= 0 && Number(options.level) <= 9) { args.push(`-mx=${Number(options.level)}`); }
    args.push('--', output, ...sources);
    const result = await chayCongCu(CONG_CU.SEVENZIP, args, { signal: options.signal, timeoutMs: options.timeoutMs, maxBufferBytes: options.maxBufferBytes });
    const stat = await fs.promises.stat(output);
    return { ...result, dinhDang: format, duongDanDich: output, kichThuocBytes: stat.size };
}

module.exports = {
    DINH_DANG_NEN,
    GIOI_HAN_MAC_DINH,
    kiemTra,
    lietKe,
    kiemTraTepNen,
    giaiNen,
    nen
};