'use strict';

const { DINH_DANG } = require('../../../constants/dinh-dang-tep');
const { LOAI_CHUYEN_DOI } = require('../../../constants/loai-chuyen-doi');
const MA_LOI = require('../../../constants/ma-loi');
const { taoLoiTheoStatus: taoLoi } = require('../../../utils/loi');
const storageService = require('../../../infrastructure/storage/storage.service');
const transformEngine = require('../engine/transform-engine.service');
const dichService = require('./dich.service');

function layStorageKey(dauVao) { return dauVao?.storageKey || dauVao?.khoa || dauVao?.khoaLuuTru || dauVao?.storage?.khoa || dauVao?.storage?.storageKey || dauVao?.phienBan?.storageKey || dauVao?.phienBanHienTai?.storageKey || null; }

async function docBufferDauVao(dauVao) { if (Buffer.isBuffer(dauVao)) { return dauVao; } if (Buffer.isBuffer(dauVao?.buffer)) { return dauVao.buffer; } const storageKey = layStorageKey(dauVao); if (storageKey) { return storageService.docBuffer(storageKey); } throw taoLoi(422, 'Không tìm thấy dữ liệu văn bản đầu vào để dịch.', MA_LOI.TEP_KHONG_THE_DOC); }

function laBuocCuoi(context) { const tongSoBuoc = Number(context.tongSoBuoc || 1); const thuTuBuoc = Number(context.thuTuBuoc || tongSoBuoc); return thuTuBuoc >= tongSoBuoc; }

async function coHoTro() { dichService.khoiTaoProviderMacDinh(); return dichService.layDanhSachProvider().length > 0; }

async function taoDauRa(context, buffer, metadata) {
    const thongTin = {
        dinhDang: DINH_DANG.TXT,
        mimeType: 'text/plain; charset=utf-8',
        kichThuocBytes: buffer.length,
        metadata
    };
    if (!laBuocCuoi(context)) { return { ...thongTin, buffer }; }
    const khoa = storageService.taoKhoaLuuTru({
        loai: storageService.LOAI_THU_MUC.OUTPUT,
        tenTep: 'ket-qua.txt'
    });
    const storage = await storageService.luuTuBuffer(khoa, buffer, {
        contentType: thongTin.mimeType,
        metadata: {
            congViecId: context.congViecId ? String(context.congViecId) : '',
            buocId: context.buocId ? String(context.buocId) : '',
            dinhDang: DINH_DANG.TXT,
            boXuLy: 'dich'
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

async function xuLyDich(context) {
    await context.kiemTraHuy();
    await context.capNhatTienTrinh(5);
    const input = await docBufferDauVao(context.dauVao);
    const vanBan = input.toString('utf8');
    await context.capNhatTienTrinh(15);
    const ketQua = await dichService.dichVanBan({
        vanBan,
        ngonNguNguon: context.tuyChon.ngonNguNguon || context.tuyChon.sourceLanguage || 'auto',
        ngonNguDich: context.tuyChon.ngonNguDich || context.tuyChon.targetLanguage,
        bangThuatNgu: context.tuyChon.bangThuatNgu || [],
        provider: context.tuyChon.provider || null,
        maxChars: context.tuyChon.maxChars,
        tuyChon: context.tuyChon,
        signal: context.signal
    });
    await context.kiemTraHuy();
    await context.capNhatTienTrinh(90);
    const output = Buffer.from(ketQua.vanBan, 'utf8');
    const dauRa = await taoDauRa(context, output, {
        ngonNguNguon: ketQua.ngonNguNguon,
        ngonNguDich: ketQua.ngonNguDich,
        provider: ketQua.provider,
        boQua: ketQua.boQua
    });
    return {
        boXuLy: 'DICH',
        congCu: ketQua.provider || 'translation-provider',
        phienBanCongCu: null,
        dauRa,
        dinhDangDich: DINH_DANG.TXT,
        thongKe: ketQua.thongKe
    };
}

function dangKyNeuChuaCo(converter) { const daCo = transformEngine.layConverter(converter.key); if (daCo) { return daCo; } return transformEngine.dangKyConverter(converter); }

function dangKyTatCa() {
    return Object.freeze([
        dangKyNeuChuaCo({
            key: 'dich:text',
            ten: 'Dịch văn bản thuần',
            loaiChuyenDoi: LOAI_CHUYEN_DOI.DICH,
            nhomXuLy: '*',
            dinhDangNguon: DINH_DANG.TXT,
            dinhDangDich: DINH_DANG.TXT,
            uuTien: 100,
            chiPhi: 2,
            engine: 'translation-provider',
            phienBanEngine: null,
            hoTro: coHoTro,
            xuLy: xuLyDich
        })
    ]);
}

const converters = dangKyTatCa();

module.exports = {
    converters,
    dangKyTatCa,
    docBufferDauVao,
    xuLyDich
};