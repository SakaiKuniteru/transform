'use strict';

const { LOAI_CHUYEN_DOI, coLoaiChuyenDoi } = require('../../../constants/loai-chuyen-doi');
const { chuanHoaDinhDang, coDinhDang } = require('../../../constants/dinh-dang-tep');
const MA_LOI = require('../../../constants/ma-loi');
const { taoLoiTheoStatus: taoLoi } = require('../../../utils/loi');
const planner = require('../engine/conversion-planner');

const SO_BUOC_TOI_DA = 10;
const TRUONG_CAM = new Set([
    'command',
    'cmd',
    'shell',
    'args',
    'argv',
    'env',
    'environment',
    'path',
    'filepath',
    'duongdan',
    'storagekey',
    'khoaluutru',
    'url',
    'headers',
    'authorization',
    'apikey',
    'api_key',
    'token',
    'secret',
    'password'
]);

function laTruongCam(key) { return TRUONG_CAM.has(String(key || '').replace(/[^A-Za-z0-9_]/g, '').toLowerCase()); }

function lamSachTuyChon(value, depth = 0) {
    if (value === undefined || value === null || typeof value === 'boolean' || typeof value === 'number') { return value; }
    if (typeof value === 'string') { return value.length > 5000 ? value.slice(0, 5000) : value; }
    if (depth >= 6) { throw new TypeError('Tùy chọn AI vượt độ sâu cho phép.'); }
    if (Array.isArray(value)) {
        if (value.length > 100) { throw new TypeError('Array tùy chọn AI vượt giới hạn.'); }
        return value.map((item) => lamSachTuyChon(item, depth + 1));
    }
    if (typeof value !== 'object') { throw new TypeError('Tùy chọn AI chứa kiểu dữ liệu không hỗ trợ.'); }
    const result = {};
    for (const [key, item] of Object.entries(value)) {
        if (laTruongCam(key)) { throw new TypeError(`AI plan chứa trường bị cấm: ${key}.`); }
        result[key] = lamSachTuyChon(item, depth + 1);
    }
    return result;
}

function chuanHoaBuoc(item, index) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) { throw new TypeError(`Bước ${index + 1} phải là object.`); }
    const loaiChuyenDoi = String(item.loaiChuyenDoi || item.type || '').trim().toUpperCase();
    if (!coLoaiChuyenDoi(loaiChuyenDoi)) { throw new TypeError(`Bước ${index + 1} có loại chuyển đổi không hợp lệ.`); }
    const dinhDangDichRaw = item.dinhDangDich ?? item.targetFormat ?? null;
    const dinhDangDich = dinhDangDichRaw ? chuanHoaDinhDang(dinhDangDichRaw) : null;
    if (dinhDangDich && !coDinhDang(dinhDangDich)) { throw new TypeError(`Bước ${index + 1} có định dạng đích không được hỗ trợ.`); }
    return {
        thuTu: index + 1,
        loaiChuyenDoi,
        dinhDangDich,
        converterKey: item.converterKey ? String(item.converterKey).trim() : null,
        tuyChon: lamSachTuyChon(item.tuyChon || item.options || {})
    };
}

async function xacThucKeHoach(input = {}) {
    const dinhDangNguonBanDau = chuanHoaDinhDang(input.dinhDangNguon);
    if (!dinhDangNguonBanDau || !coDinhDang(dinhDangNguonBanDau)) { throw taoLoi(415, 'Định dạng nguồn của kế hoạch AI không hợp lệ.', MA_LOI.TEP_DINH_DANG_KHONG_HO_TRO); }
    const cacBuocRaw = Array.isArray(input.cacBuoc) ? input.cacBuoc : [];
    if (!cacBuocRaw.length) { throw taoLoi(422, 'Kế hoạch AI không có bước xử lý.', MA_LOI.AI_PHAN_HOI_KHONG_HOP_LE); }
    if (cacBuocRaw.length > SO_BUOC_TOI_DA) { throw taoLoi(422, `Kế hoạch AI không được vượt quá ${SO_BUOC_TOI_DA} bước.`, MA_LOI.AI_PHAN_HOI_KHONG_HOP_LE); }
    let dinhDangHienTai = dinhDangNguonBanDau;
    const cacBuoc = [];
    for (let index = 0; index < cacBuocRaw.length; index += 1) {
        const buoc = chuanHoaBuoc(cacBuocRaw[index], index);
        const dinhDangDich = buoc.dinhDangDich || (buoc.loaiChuyenDoi === LOAI_CHUYEN_DOI.CHUYEN_DINH_DANG ? null : dinhDangHienTai);
        if (!dinhDangDich) { throw taoLoi(422, `Bước ${index + 1} chuyển đổi định dạng nhưng thiếu định dạng đích.`, MA_LOI.AI_PHAN_HOI_KHONG_HOP_LE); }
        const keHoach = await planner.lapKeHoach({
            loaiChuyenDoi: buoc.loaiChuyenDoi,
            nhomXuLy: input.nhomXuLy || null,
            dinhDangNguon: dinhDangHienTai,
            dinhDangDich,
            converterKey: buoc.converterKey,
            tuyChon: buoc.tuyChon
        });
        if (!keHoach?.cacBuoc?.length) { throw taoLoi(422, `Không tìm thấy converter hợp lệ cho bước ${index + 1}.`, MA_LOI.CHUYEN_DOI_KHONG_TIM_THAY_CONVERTER); }
        cacBuoc.push({
            ...buoc,
            dinhDangNguon: dinhDangHienTai,
            dinhDangDich,
            keHoachConverterKeys: keHoach.cacBuoc.map((item) => item.converterKey),
            chiPhi: keHoach.chiPhi
        });
        dinhDangHienTai = dinhDangDich;
    }
    return Object.freeze({
        dinhDangNguon: dinhDangNguonBanDau,
        dinhDangDich: dinhDangHienTai,
        soBuoc: cacBuoc.length,
        cacBuoc: Object.freeze(cacBuoc.map((item) => Object.freeze(item)))
    });
}

module.exports = {
    SO_BUOC_TOI_DA,
    TRUONG_CAM,
    lamSachTuyChon,
    xacThucKeHoach
};