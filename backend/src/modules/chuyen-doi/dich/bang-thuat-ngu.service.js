'use strict';

const MAX_THUAT_NGU = 1000;
const MAX_DO_DAI_THUAT_NGU = 500;

function chuanHoaChuoi(value, ten) { const text = String(value || '').trim(); if (!text) { throw new TypeError(`${ten} không được để trống.`); } if (text.length > MAX_DO_DAI_THUAT_NGU) { throw new TypeError(`${ten} không được vượt quá ${MAX_DO_DAI_THUAT_NGU} ký tự.`); } return text; }

function chuanHoaBangThuatNgu(value = []) {
    if (value === undefined || value === null) { return Object.freeze([]); }
    if (!Array.isArray(value)) { throw new TypeError('Bảng thuật ngữ phải là array.'); }
    if (value.length > MAX_THUAT_NGU) { throw new TypeError(`Bảng thuật ngữ không được vượt quá ${MAX_THUAT_NGU} mục.`); }
    const ketQua = [];
    const daCo = new Set();
    for (const item of value) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) { throw new TypeError('Mỗi thuật ngữ phải là object.'); }
        const nguon = chuanHoaChuoi(item.nguon ?? item.source, 'Thuật ngữ nguồn');
        const dich = chuanHoaChuoi(item.dich ?? item.target, 'Thuật ngữ đích');
        const phanBietHoaThuong = item.phanBietHoaThuong === true;
        const key = `${phanBietHoaThuong ? '1' : '0'}:${phanBietHoaThuong ? nguon : nguon.toLocaleLowerCase()}`;
        if (daCo.has(key)) { continue; }
        daCo.add(key);
        ketQua.push(Object.freeze({ nguon, dich, phanBietHoaThuong }));
    }
    return Object.freeze(ketQua.sort((a, b) => b.nguon.length - a.nguon.length));
}

function escapeRegex(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function baoVeVanBan(vanBan, bangThuatNgu = []) {
    let text = String(vanBan ?? '');
    const danhSach = chuanHoaBangThuatNgu(bangThuatNgu);
    const placeholders = [];
    danhSach.forEach((item, index) => {
        const placeholder = `⟦TF_GLOSSARY_${index.toString(36).toUpperCase()}⟧`;
        const regex = new RegExp(escapeRegex(item.nguon), item.phanBietHoaThuong ? 'g' : 'gi');
        let soLan = 0;
        text = text.replace(regex, () => {
            soLan += 1;
            return placeholder;
        });
        if (soLan > 0) { placeholders.push({ placeholder, dich: item.dich, soLan }); }
    });
    return { vanBan: text, placeholders, bangThuatNgu: danhSach };
}

function phucHoiVanBan(vanBan, placeholders = []) { let text = String(vanBan ?? ''); for (const item of placeholders) { text = text.split(item.placeholder).join(item.dich); } return text; }

function taoDanhSachChoProvider(bangThuatNgu = []) { return chuanHoaBangThuatNgu(bangThuatNgu).map((item) => ({ source: item.nguon, target: item.dich, caseSensitive: item.phanBietHoaThuong })); }

function taoHuongDan(bangThuatNgu = []) { const danhSach = chuanHoaBangThuatNgu(bangThuatNgu); if (!danhSach.length) { return null; } return `Giữ đúng các thuật ngữ sau khi dịch: ${danhSach.map((item) => `"${item.nguon}" → "${item.dich}"`).join('; ')}`; }

module.exports = {
    MAX_THUAT_NGU,
    MAX_DO_DAI_THUAT_NGU,
    chuanHoaBangThuatNgu,
    baoVeVanBan,
    phucHoiVanBan,
    taoDanhSachChoProvider,
    taoHuongDan
};