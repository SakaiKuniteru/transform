'use strict';

const { DINH_DANG } = require('../../../constants/dinh-dang-tep');
const { LOAI_CHUYEN_DOI } = require('../../../constants/loai-chuyen-doi');
const MA_LOI = require('../../../constants/ma-loi');
const { taoLoiTheoStatus: taoLoi } = require('../../../utils/loi');
const storageService = require('../../../infrastructure/storage/storage.service');
const transformEngine = require('../engine/transform-engine.service');
const ocrService = require('./ocr.service');

const DINH_DANG_NGUON_HO_TRO = Object.freeze([
    DINH_DANG.PNG,
    DINH_DANG.JPG,
    DINH_DANG.JPEG,
    DINH_DANG.WEBP,
    DINH_DANG.BMP,
    DINH_DANG.TIFF,
    DINH_DANG.TIF
]);

function layStorageKey(dauVao) {
    return dauVao?.storageKey || dauVao?.khoa || dauVao?.khoaLuuTru || dauVao?.storage?.khoa || dauVao?.storage?.storageKey || dauVao?.phienBan?.storageKey || dauVao?.phienBanHienTai?.storageKey || null;
}

async function docBufferDauVao(dauVao) {
    if (Buffer.isBuffer(dauVao)) { return dauVao; }
    if (Buffer.isBuffer(dauVao?.buffer)) { return dauVao.buffer; }
    const storageKey = layStorageKey(dauVao);
    if (storageKey) { return storageService.docBuffer(storageKey); }
    throw taoLoi(422, 'Không tìm thấy dữ liệu ảnh đầu vào để OCR.', MA_LOI.TEP_KHONG_THE_DOC);
}

function laBuocCuoi(context) {
    const tongSoBuoc = Number(context.tongSoBuoc || 1);
    const thuTuBuoc = Number(context.thuTuBuoc || tongSoBuoc);
    return thuTuBuoc >= tongSoBuoc;
}

async function taoDauRa(context, buffer, metadata) {
    const thongTin = {
        dinhDang: DINH_DANG.TXT,
        mimeType: 'text/plain; charset=utf-8',
        kichThuocBytes: buffer.length,
        metadata
    };
    if (!laBuocCuoi(context)) { return { ...thongTin, buffer }; }
    const khoa = storageService.taoKhoaLuuTru({ loai: storageService.LOAI_THU_MUC.OUTPUT, tenTep: 'ket-qua.txt' });
    const storage = await storageService.luuTuBuffer(khoa, buffer, {
        contentType: thongTin.mimeType,
        metadata: {
            congViecId: context.congViecId ? String(context.congViecId) : '',
            buocId: context.buocId ? String(context.buocId) : '',
            dinhDang: DINH_DANG.TXT,
            boXuLy: 'ocr'
        }
    });
    return {
        ...thongTin,
        storageKey: storage.khoa,
        storageDriver: storage.driver,
        storageBucket: storage.bucket,
        storageEtag: storage.etag
    };
}

async function xuLyOcr(context) {
    await context.kiemTraHuy();
    await context.capNhatTienTrinh(5);
    const buffer = await docBufferDauVao(context.dauVao);
    await context.capNhatTienTrinh(20);
    const ketQua = await ocrService.nhanDang({
        buffer,
        dinhDangNguon: context.dinhDangNguon,
        ngonNgu: context.tuyChon.ngonNgu || context.tuyChon.lang || 'vie+eng',
        provider: context.tuyChon.provider || null,
        psm: context.tuyChon.psm,
        oem: context.tuyChon.oem,
        preserveInterwordSpaces: context.tuyChon.preserveInterwordSpaces === true,
        signal: context.signal,
        timeoutMs: context.tuyChon.timeoutMs,
        maxBufferBytes: context.tuyChon.maxBufferBytes
    });
    await context.kiemTraHuy();
    await context.capNhatTienTrinh(90);
    const output = Buffer.from(ketQua.vanBan || '', 'utf8');
    const dauRa = await taoDauRa(context, output, {
        provider: ketQua.provider,
        ngonNgu: ketQua.ngonNgu,
        thoiGianMs: ketQua.thoiGianMs
    });
    return {
        boXuLy: 'OCR',
        congCu: ketQua.congCu || ketQua.provider || 'tesseract',
        phienBanCongCu: null,
        dauRa,
        dinhDangDich: DINH_DANG.TXT,
        thongKe: {
            soKyTu: (ketQua.vanBan || '').length,
            ngonNgu: ketQua.ngonNgu,
            provider: ketQua.provider
        }
    };
}

function dangKyNeuChuaCo(converter) {
    const daCo = transformEngine.layConverter(converter.key);
    if (daCo) { return daCo; }
    return transformEngine.dangKyConverter(converter);
}

function dangKyTatCa() {
    return Object.freeze([
        dangKyNeuChuaCo({
            key: 'tesseract:ocr-image',
            ten: 'OCR ảnh bằng Tesseract',
            loaiChuyenDoi: LOAI_CHUYEN_DOI.OCR,
            nhomXuLy: 'OCR',
            dinhDangNguon: DINH_DANG_NGUON_HO_TRO,
            dinhDangDich: DINH_DANG.TXT,
            uuTien: 100,
            chiPhi: 3,
            engine: 'tesseract',
            phienBanEngine: null,
            xuLy: xuLyOcr
        })
    ]);
}

const converters = dangKyTatCa();

module.exports = {
    DINH_DANG_NGUON_HO_TRO,
    converters,
    dangKyTatCa,
    docBufferDauVao,
    xuLyOcr
};