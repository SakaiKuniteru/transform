'use strict';

const MA_LOI = require('../../../constants/ma-loi');
const { coLoaiChuyenDoi } = require('../../../constants/loai-chuyen-doi');
const { chuanHoaDinhDang, coDinhDang } = require('../../../constants/dinh-dang-tep');
const { taoLoiTheoStatus: taoLoi } = require('../../../utils/loi');

function layGiaTri(...values) {
    for (const value of values) {
        if (value !== undefined && value !== null && value !== '') { return value; }
    }
    return null;
}

function chuanHoaObject(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }

function chuanHoaLoaiChuyenDoi(value) {
    const loai = value ? String(value).trim().toUpperCase() : null;
    if (!loai || !coLoaiChuyenDoi(loai)) { throw taoLoi(400, 'Loại chuyển đổi không hợp lệ hoặc chưa được cung cấp.', MA_LOI.CHUYEN_DOI_KHONG_HO_TRO); }
    return loai;
}

function chuanHoaDinhDangNeuCo(value, ten) {
    if (value === undefined || value === null || value === '') { return null; }
    const dinhDang = chuanHoaDinhDang(value);
    if (!coDinhDang(dinhDang)) { throw taoLoi(415, `${ten} "${value}" không được hỗ trợ.`, MA_LOI.TEP_DINH_DANG_KHONG_HO_TRO); }
    return dinhDang;
}

function chuanHoaTienTrinh(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) { throw new TypeError('Tiến trình phải là số.'); }
    return Math.max(0, Math.min(100, number));
}

function taoTransformContext(input = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) { throw new TypeError('Transform context đầu vào phải là object.'); }
    const jobData = chuanHoaObject(input.jobData);
    const tuyChon = chuanHoaObject(input.tuyChon);
    const congViec = chuanHoaObject(input.congViec);
    const buoc = input.buoc && typeof input.buoc === 'object' && !Array.isArray(input.buoc) ? input.buoc : null;
    const dauVao = chuanHoaObject(input.dauVao);
    const loaiChuyenDoi = chuanHoaLoaiChuyenDoi(layGiaTri(
        input.loaiChuyenDoi,
        jobData.loaiChuyenDoi,
        tuyChon.loaiChuyenDoi,
        buoc?.loaiChuyenDoi,
        congViec.loaiChuyenDoi
    ));
    const dinhDangNguon = chuanHoaDinhDangNeuCo(layGiaTri(
        input.dinhDangNguon,
        jobData.dinhDangNguon,
        tuyChon.dinhDangNguon,
        buoc?.dinhDangNguon,
        congViec.dinhDangNguon,
        dauVao.dinhDangNguon,
        dauVao.dinhDang
    ), 'Định dạng nguồn');
    const dinhDangDich = chuanHoaDinhDangNeuCo(layGiaTri(
        input.dinhDangDich,
        jobData.dinhDangDich,
        tuyChon.dinhDangDich,
        buoc?.dinhDangDich,
        congViec.dinhDangDich
    ), 'Định dạng đích');
    const nhomXuLy = layGiaTri(input.nhomXuLy, jobData.nhomXuLy, tuyChon.nhomXuLy, input.loaiXuLy);
    const converterKey = layGiaTri(input.converterKey, jobData.converterKey, tuyChon.converterKey, buoc?.converterKey);
    const capNhatTienTrinhGoc = typeof input.capNhatTienTrinh === 'function' ? input.capNhatTienTrinh : async () => null;
    const kiemTraHuyGoc = typeof input.kiemTraHuy === 'function' ? input.kiemTraHuy : async () => null;
    async function capNhatTienTrinh(value) { return capNhatTienTrinhGoc(chuanHoaTienTrinh(value)); }
    async function kiemTraHuy() { return kiemTraHuyGoc(); }
    function taoContextConverter(buocKeHoach, index, tongSoBuoc, dauVaoBuoc) {
        const batDau = tongSoBuoc > 0 ? index / tongSoBuoc * 100 : 0;
        const ketThuc = tongSoBuoc > 0 ? (index + 1) / tongSoBuoc * 100 : 100;
        async function capNhatTienTrinhBuoc(value) {
            const local = chuanHoaTienTrinh(value);
            return capNhatTienTrinh(batDau + (ketThuc - batDau) * local / 100);
        }
        return Object.freeze({
            ...input,
            jobData,
            tuyChon,
            congViec,
            buoc,
            dauVao: dauVaoBuoc,
            loaiChuyenDoi,
            nhomXuLy: nhomXuLy ? String(nhomXuLy).trim().toUpperCase() : null,
            converterKey: buocKeHoach.converterKey,
            dinhDangNguon: buocKeHoach.dinhDangNguon,
            dinhDangDich: buocKeHoach.dinhDangDich,
            thuTuBuoc: index + 1,
            tongSoBuoc,
            capNhatTienTrinh: capNhatTienTrinhBuoc,
            kiemTraHuy
        });
    }
    return Object.freeze({
        ...input,
        jobData,
        tuyChon,
        congViec,
        buoc,
        dauVao,
        loaiChuyenDoi,
        nhomXuLy: nhomXuLy ? String(nhomXuLy).trim().toUpperCase() : null,
        converterKey: converterKey ? String(converterKey).trim() : null,
        dinhDangNguon,
        dinhDangDich,
        capNhatTienTrinh,
        kiemTraHuy,
        taoContextConverter
    });
}

module.exports = {
    taoTransformContext
};