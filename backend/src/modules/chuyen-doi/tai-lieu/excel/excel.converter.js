'use strict';

const { DINH_DANG } = require('../../../../constants/dinh-dang-tep');
const { LOAI_CHUYEN_DOI } = require('../../../../constants/loai-chuyen-doi');
const MA_LOI = require('../../../../constants/ma-loi');
const { taoLoiTheoStatus: taoLoi } = require('../../../../utils/loi');
const storageService = require('../../../../infrastructure/storage/storage.service');
const libreoffice = require('../../../../infrastructure/process/libreoffice');
const transformEngine = require('../../engine/transform-engine.service');
const parser = require('./excel.parser');
const renderer = require('./excel.renderer');

const DINH_DANG_EXCEL = parser.DINH_DANG_EXCEL;
const DINH_DANG_DICH = Object.freeze([DINH_DANG.CSV, DINH_DANG.JSON, DINH_DANG.PDF]);
let libreOfficePromise = null;

function layStorageKey(dauVao) { return dauVao?.storageKey || dauVao?.khoa || dauVao?.khoaLuuTru || dauVao?.storage?.khoa || dauVao?.storage?.storageKey || dauVao?.phienBan?.storageKey || dauVao?.phienBanHienTai?.storageKey || null; }

async function docBufferDauVao(dauVao) { if (Buffer.isBuffer(dauVao)) { return dauVao; } if (Buffer.isBuffer(dauVao?.buffer)) { return dauVao.buffer; } const storageKey = layStorageKey(dauVao); if (storageKey) { return storageService.docBuffer(storageKey); } throw taoLoi(422, 'Không tìm thấy dữ liệu bảng tính đầu vào.', MA_LOI.TEP_KHONG_THE_DOC); }

function laBuocCuoi(context) { const tongSoBuoc = Number(context.tongSoBuoc || 1); const thuTuBuoc = Number(context.thuTuBuoc || tongSoBuoc); return thuTuBuoc >= tongSoBuoc; }

function layMimeType(dinhDang) { if (dinhDang === DINH_DANG.CSV) { return 'text/csv; charset=utf-8'; } if (dinhDang === DINH_DANG.JSON) { return 'application/json; charset=utf-8'; } if (dinhDang === DINH_DANG.PDF) { return 'application/pdf'; } return 'application/octet-stream'; }

async function taoDauRa(context, ketQua) {
    const thongTin = { dinhDang: ketQua.dinhDang, mimeType: ketQua.mimeType || layMimeType(ketQua.dinhDang), kichThuocBytes: ketQua.kichThuocBytes, metadata: ketQua.metadata || {} };
    if (!laBuocCuoi(context)) { return { ...thongTin, buffer: ketQua.buffer }; }
    const khoa = storageService.taoKhoaLuuTru({ loai: storageService.LOAI_THU_MUC.OUTPUT, tenTep: `ket-qua.${ketQua.dinhDang}` });
    const storage = await storageService.luuTuBuffer(khoa, ketQua.buffer, { contentType: thongTin.mimeType, metadata: { congViecId: context.congViecId ? String(context.congViecId) : '', buocId: context.buocId ? String(context.buocId) : '', dinhDang: ketQua.dinhDang, boXuLy: 'excel' } });
    return { ...thongTin, storageKey: storage.khoa, storageDriver: storage.driver, storageBucket: storage.bucket, storageEtag: storage.etag };
}

async function coLibreOffice() { if (!libreOfficePromise) { libreOfficePromise = libreoffice.kiemTra().then(() => true).catch(() => false); } return libreOfficePromise; }

async function hoTroExcel(context = {}) {
    const nguon = String(context.dinhDangNguon || '').trim().toLowerCase();
    const dich = String(context.dinhDangDich || '').trim().toLowerCase();
    if (!DINH_DANG_EXCEL.includes(nguon) || !DINH_DANG_DICH.includes(dich)) { return false; }
    if (dich === DINH_DANG.PDF || nguon === DINH_DANG.XLS) { return coLibreOffice(); }
    return true;
}

async function xuLyChuyenDinhDang(context) {
    await context.kiemTraHuy();
    await context.capNhatTienTrinh(5);
    const buffer = await docBufferDauVao(context.dauVao);
    const metadataNguon = await parser.layMetadata(buffer, context.dinhDangNguon);
    const dich = String(context.dinhDangDich || '').trim().toLowerCase();
    if (!DINH_DANG_DICH.includes(dich)) { throw taoLoi(415, `Định dạng Excel đích "${dich || 'không xác định'}" chưa được hỗ trợ.`, MA_LOI.TEP_DINH_DANG_KHONG_HO_TRO); }
    await context.capNhatTienTrinh(20);
    const ketQua = dich === DINH_DANG.CSV ? await renderer.chuyenSangCsv(buffer, metadataNguon.dinhDang, context.tuyChon) : dich === DINH_DANG.JSON ? await renderer.chuyenSangJson(buffer, metadataNguon.dinhDang, context.tuyChon) : await renderer.chuyenSangPdf(buffer, metadataNguon.dinhDang, { ...context.tuyChon, signal: context.signal });
    await context.kiemTraHuy();
    await context.capNhatTienTrinh(90);
    const dauRa = await taoDauRa(context, ketQua);
    return { boXuLy: 'TAI_LIEU', congCu: dich === DINH_DANG.PDF || metadataNguon.dinhDang === DINH_DANG.XLS ? 'libreoffice' : 'transform-excel-parser', phienBanCongCu: null, dauRa, dinhDangDich: dich, thongKe: { dinhDangNguon: metadataNguon.dinhDang, kichThuocNguonBytes: buffer.length, kichThuocDichBytes: ketQua.kichThuocBytes, ...(ketQua.thongKe || {}) } };
}

function dangKyNeuChuaCo(converter) { const daCo = transformEngine.layConverter(converter.key); if (daCo) { return daCo; } return transformEngine.dangKyConverter(converter); }

function dangKyTatCa() {
    return Object.freeze([
        dangKyNeuChuaCo({
            key: 'excel:chuyen-dinh-dang',
            ten: 'Chuyển đổi bảng tính Excel/OpenDocument',
            loaiChuyenDoi: LOAI_CHUYEN_DOI.CHUYEN_DINH_DANG,
            nhomXuLy: 'TAI_LIEU',
            dinhDangNguon: DINH_DANG_EXCEL,
            dinhDangDich: DINH_DANG_DICH,
            uuTien: 100,
            chiPhi: 2,
            engine: 'excel',
            phienBanEngine: null,
            hoTro: hoTroExcel,
            xuLy: xuLyChuyenDinhDang
        })
    ]);
}

const converters = dangKyTatCa();

module.exports = {
    DINH_DANG_EXCEL,
    DINH_DANG_DICH,
    converters,
    dangKyTatCa,
    docBufferDauVao,
    hoTroExcel,
    xuLyChuyenDinhDang
};