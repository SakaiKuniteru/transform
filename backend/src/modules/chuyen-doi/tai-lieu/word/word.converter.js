'use strict';

const { DINH_DANG } = require('../../../../constants/dinh-dang-tep');
const { LOAI_CHUYEN_DOI } = require('../../../../constants/loai-chuyen-doi');
const MA_LOI = require('../../../../constants/ma-loi');
const { taoLoiTheoStatus: taoLoi } = require('../../../../utils/loi');
const storageService = require('../../../../infrastructure/storage/storage.service');
const libreoffice = require('../../../../infrastructure/process/libreoffice');
const pandoc = require('../../../../infrastructure/process/pandoc');
const transformEngine = require('../../engine/transform-engine.service');
const parser = require('./word.parser');
const renderer = require('./word.renderer');

const DINH_DANG_WORD = parser.DINH_DANG_WORD;
const DINH_DANG_DICH = Object.freeze([DINH_DANG.PDF, DINH_DANG.HTML, DINH_DANG.HTM, DINH_DANG.TXT, DINH_DANG.MARKDOWN]);
let libreofficePromise = null;
let pandocPromise = null;

function layStorageKey(dauVao) { return dauVao?.storageKey || dauVao?.khoa || dauVao?.khoaLuuTru || dauVao?.storage?.khoa || dauVao?.storage?.storageKey || dauVao?.phienBan?.storageKey || dauVao?.phienBanHienTai?.storageKey || null; }

async function docBufferDauVao(dauVao) { if (Buffer.isBuffer(dauVao)) { return dauVao; } if (Buffer.isBuffer(dauVao?.buffer)) { return dauVao.buffer; } const storageKey = layStorageKey(dauVao); if (storageKey) { return storageService.docBuffer(storageKey); } throw taoLoi(422, 'Không tìm thấy dữ liệu tài liệu Word đầu vào.', MA_LOI.TEP_KHONG_THE_DOC); }

function laBuocCuoi(context) { const tongSoBuoc = Number(context.tongSoBuoc || 1); const thuTuBuoc = Number(context.thuTuBuoc || tongSoBuoc); return thuTuBuoc >= tongSoBuoc; }

function layExtension(dinhDang) { return dinhDang === DINH_DANG.HTM ? 'htm' : dinhDang; }

async function taoDauRa(context, ketQua) {
    const thongTin = { dinhDang: ketQua.dinhDang, mimeType: ketQua.mimeType, kichThuocBytes: ketQua.kichThuocBytes, metadata: ketQua.metadata || {} };
    if (!laBuocCuoi(context)) { return { ...thongTin, buffer: ketQua.buffer }; }
    const khoa = storageService.taoKhoaLuuTru({ loai: storageService.LOAI_THU_MUC.OUTPUT, tenTep: `ket-qua.${layExtension(ketQua.dinhDang)}` });
    const storage = await storageService.luuTuBuffer(khoa, ketQua.buffer, {
        contentType: ketQua.mimeType,
        metadata: {
            congViecId: context.congViecId ? String(context.congViecId) : '',
            buocId: context.buocId ? String(context.buocId) : '',
            dinhDang: ketQua.dinhDang,
            boXuLy: 'word'
        }
    });
    return { ...thongTin, storageKey: storage.khoa, storageDriver: storage.driver, storageBucket: storage.bucket, storageEtag: storage.etag };
}

async function coLibreOffice() { if (!libreofficePromise) { libreofficePromise = libreoffice.kiemTra().then(() => true).catch(() => false); } return libreofficePromise; }

async function coPandoc() { if (!pandocPromise) { pandocPromise = pandoc.kiemTra().then(() => true).catch(() => false); } return pandocPromise; }

async function hoTroWord(context = {}) {
    const nguon = String(context.dinhDangNguon || '').trim().toLowerCase();
    const dich = String(context.dinhDangDich || '').trim().toLowerCase();
    if (!DINH_DANG_WORD.includes(nguon) || !DINH_DANG_DICH.includes(dich)) { return false; }
    if (dich === DINH_DANG.PDF) { return coLibreOffice(); }
    if (nguon === DINH_DANG.DOC) { return Boolean(await coLibreOffice() && await coPandoc()); }
    return coPandoc();
}

async function xuLyChuyenDinhDang(context) {
    await context.kiemTraHuy();
    await context.capNhatTienTrinh(5);
    const buffer = await docBufferDauVao(context.dauVao);
    const metadataNguon = await parser.layMetadata(buffer, context.dinhDangNguon);
    const dinhDangDich = String(context.dinhDangDich || '').trim().toLowerCase();
    if (!DINH_DANG_DICH.includes(dinhDangDich)) { throw taoLoi(415, `Định dạng Word đích "${dinhDangDich || 'không xác định'}" chưa được hỗ trợ.`, MA_LOI.TEP_DINH_DANG_KHONG_HO_TRO); }
    await context.capNhatTienTrinh(20);
    const ketQua = dinhDangDich === DINH_DANG.PDF ? await renderer.chuyenSangPdf(buffer, metadataNguon.dinhDang, { ...context.tuyChon, signal: context.signal }) : await renderer.chuyenSangVanBan(buffer, metadataNguon.dinhDang, dinhDangDich, { ...context.tuyChon, signal: context.signal });
    await context.kiemTraHuy();
    await context.capNhatTienTrinh(90);
    const dauRa = await taoDauRa(context, ketQua);
    return {
        boXuLy: 'TAI_LIEU',
        congCu: ketQua.thongKe?.congCu || (dinhDangDich === DINH_DANG.PDF ? 'libreoffice' : 'pandoc'),
        phienBanCongCu: null,
        dauRa,
        dinhDangDich,
        thongKe: {
            kichThuocNguonBytes: buffer.length,
            kichThuocDichBytes: ketQua.kichThuocBytes,
            dinhDangNguon: metadataNguon.dinhDang,
            ...ketQua.thongKe
        }
    };
}

function dangKyNeuChuaCo(converter) { const daCo = transformEngine.layConverter(converter.key); if (daCo) { return daCo; } return transformEngine.dangKyConverter(converter); }

function dangKyTatCa() {
    return Object.freeze([
        dangKyNeuChuaCo({
            key: 'word:chuyen-dinh-dang',
            ten: 'Chuyển đổi tài liệu Word bằng LibreOffice/Pandoc',
            loaiChuyenDoi: LOAI_CHUYEN_DOI.CHUYEN_DINH_DANG,
            nhomXuLy: 'TAI_LIEU',
            dinhDangNguon: DINH_DANG_WORD,
            dinhDangDich: DINH_DANG_DICH,
            uuTien: 100,
            chiPhi: 2,
            engine: 'word',
            phienBanEngine: null,
            hoTro: hoTroWord,
            xuLy: xuLyChuyenDinhDang
        })
    ]);
}

const converters = dangKyTatCa();

module.exports = {
    DINH_DANG_WORD,
    DINH_DANG_DICH,
    converters,
    dangKyTatCa,
    docBufferDauVao,
    hoTroWord,
    xuLyChuyenDinhDang
};