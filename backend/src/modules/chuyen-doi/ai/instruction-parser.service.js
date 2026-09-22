'use strict';

const { LOAI_CHUYEN_DOI, coLoaiChuyenDoi } = require('../../../constants/loai-chuyen-doi');
const { chuanHoaDinhDang, coDinhDang } = require('../../../constants/dinh-dang-tep');

function chuanHoaChiDan(value) { if (typeof value !== 'string') { throw new TypeError('Chỉ dẫn phải là string.'); } const text = value.trim(); if (!text) { throw new TypeError('Chỉ dẫn không được để trống.'); } if (text.length > 20000) { throw new TypeError('Chỉ dẫn không được vượt quá 20000 ký tự.'); } return text; }

function parseJson(value) { try { const data = JSON.parse(value); return data && typeof data === 'object' && !Array.isArray(data) ? data : null; } catch { return null; } }

function layDinhDangDich(text) { const match = text.match(/(?:sang|thành|thanh|to|into)\s+\.?([a-z0-9]{2,10})\b/i); if (!match) { return null; } const dinhDang = chuanHoaDinhDang(match[1]); return coDinhDang(dinhDang) ? dinhDang : null; }

function layNgonNguDich(text) { const match = text.match(/(?:dịch|dich|translate)[\s\S]{0,80}?(?:sang|thành|thanh|to|into)\s+([a-z]{2,3}(?:-[a-z0-9]{2,8})?)/i); return match ? match[1].toLowerCase() : null; }

function parseMotChiDan(text) {
    const lower = text.toLocaleLowerCase('vi');
    const format = layDinhDangDich(text);
    const size = text.match(/(?:resize|đổi kích thước|doi kich thuoc|kích thước|kich thuoc)\D{0,20}(\d{1,5})\s*[x×]\s*(\d{1,5})/i);
    if (size) { return { loaiChuyenDoi: LOAI_CHUYEN_DOI.DOI_KICH_THUOC, tuyChon: { width: Number(size[1]), height: Number(size[2]) } }; }
    const rotate = text.match(/(?:xoay|rotate)\D{0,10}(-?\d{1,3})/i);
    if (rotate) { return { loaiChuyenDoi: LOAI_CHUYEN_DOI.XOAY, tuyChon: { angle: Number(rotate[1]) } }; }
    if (/\b(?:ocr|nhận dạng chữ|nhan dang chu)\b/i.test(text)) { return { loaiChuyenDoi: LOAI_CHUYEN_DOI.OCR, tuyChon: {} }; }
    if (/\b(?:dịch|dich|translate)\b/i.test(text)) {
        const ngonNguDich = layNgonNguDich(text);
        return ngonNguDich ? { loaiChuyenDoi: LOAI_CHUYEN_DOI.DICH, tuyChon: { ngonNguDich } } : null;
    }
    if (/\b(?:tóm tắt|tom tat|summari[sz]e)\b/i.test(text)) { return { loaiChuyenDoi: LOAI_CHUYEN_DOI.TOM_TAT, tuyChon: { chiDan: text } }; }
    if (/\b(?:tối ưu ảnh|toi uu anh|optimi[sz]e image)\b/i.test(text)) {
        const quality = Number(text.match(/(?:quality|chất lượng|chat luong)\D{0,10}(\d{1,3})/i)?.[1]);
        return {
            loaiChuyenDoi: LOAI_CHUYEN_DOI.TOI_UU_HINH_ANH,
            tuyChon: Number.isFinite(quality) ? { quality } : {}
        };
    }
    if (/\b(?:chuẩn hóa|chuan hoa|normalize)\b/i.test(text)) { return { loaiChuyenDoi: LOAI_CHUYEN_DOI.CHUAN_HOA, tuyChon: { chiDan: text } }; }
    if (/\b(?:chỉnh sửa|chinh sua|rewrite|edit)\b/i.test(text)) { return { loaiChuyenDoi: LOAI_CHUYEN_DOI.CHINH_SUA, tuyChon: { chiDan: text } }; }
    if (/\b(?:kiểm tra|kiem tra|proofread|check)\b/i.test(text)) { return { loaiChuyenDoi: LOAI_CHUYEN_DOI.KIEM_TRA, tuyChon: { chiDan: text } }; }
    if (format && /\b(?:chuyển|chuyen|convert|đổi|doi)\b/i.test(lower)) { return { loaiChuyenDoi: LOAI_CHUYEN_DOI.CHUYEN_DINH_DANG, dinhDangDich: format, tuyChon: {} }; }
    return null;
}

function parseObject(data) {
    const cacBuocRaw = Array.isArray(data.cacBuoc) ? data.cacBuoc : Array.isArray(data.steps) ? data.steps : [data];
    const cacBuoc = cacBuocRaw.map((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) { throw new TypeError('Mỗi bước chỉ dẫn phải là object.'); }
        const loai = String(item.loaiChuyenDoi || item.type || '').trim().toUpperCase();
        if (!coLoaiChuyenDoi(loai)) { throw new TypeError(`Loại chuyển đổi "${loai}" không hợp lệ.`); }
        const dinhDangDich = item.dinhDangDich || item.targetFormat ? chuanHoaDinhDang(item.dinhDangDich || item.targetFormat) : null;
        if (dinhDangDich && !coDinhDang(dinhDangDich)) { throw new TypeError(`Định dạng đích "${dinhDangDich}" không hợp lệ.`); }
        return {
            loaiChuyenDoi: loai,
            dinhDangDich,
            converterKey: item.converterKey ? String(item.converterKey).trim() : null,
            tuyChon: item.tuyChon && typeof item.tuyChon === 'object' && !Array.isArray(item.tuyChon) ? item.tuyChon : item.options && typeof item.options === 'object' && !Array.isArray(item.options) ? item.options : {}
        };
    });
    return { nguon: 'JSON', cacBuoc };
}

function parseInstruction(value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) { return parseObject(value); }
    const text = chuanHoaChiDan(value);
    const json = parseJson(text);
    if (json) { return parseObject(json); }
    const parts = text.split(/\s*(?:\n+|;|\brồi\b|\bsau đó\b|\bthen\b)\s*/i).map((item) => item.trim()).filter(Boolean);
    const cacBuoc = parts.map(parseMotChiDan).filter(Boolean);
    return {
        nguon: 'HEURISTIC',
        chiDan: text,
        cacBuoc,
        canAI: cacBuoc.length === 0 || cacBuoc.length < parts.length
    };
}

module.exports = {
    chuanHoaChiDan,
    parseInstruction
};