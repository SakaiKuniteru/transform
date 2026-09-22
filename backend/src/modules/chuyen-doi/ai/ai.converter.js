'use strict';

const { DINH_DANG } = require('../../../constants/dinh-dang-tep');
const { LOAI_CHUYEN_DOI } = require('../../../constants/loai-chuyen-doi');
const MA_LOI = require('../../../constants/ma-loi');
const { taoLoiTheoStatus: taoLoi } = require('../../../utils/loi');
const storageService = require('../../../infrastructure/storage/storage.service');
const transformEngine = require('../engine/transform-engine.service');
const aiService = require('./ai.service');

const LOAI_AI_VAN_BAN = Object.freeze([
    LOAI_CHUYEN_DOI.DINH_DANG_LAI,
    LOAI_CHUYEN_DOI.THU_GON,
    LOAI_CHUYEN_DOI.KIEM_TRA,
    LOAI_CHUYEN_DOI.CHINH_SUA,
    LOAI_CHUYEN_DOI.THAY_THE,
    LOAI_CHUYEN_DOI.TOM_TAT,
    LOAI_CHUYEN_DOI.CHUAN_HOA
]);

function layStorageKey(dauVao) { return dauVao?.storageKey || dauVao?.khoa || dauVao?.khoaLuuTru || dauVao?.storage?.khoa || dauVao?.storage?.storageKey || dauVao?.phienBan?.storageKey || dauVao?.phienBanHienTai?.storageKey || null; }

async function docBufferDauVao(dauVao) { if (Buffer.isBuffer(dauVao)) { return dauVao; } if (Buffer.isBuffer(dauVao?.buffer)) { return dauVao.buffer; } const storageKey = layStorageKey(dauVao); if (storageKey) { return storageService.docBuffer(storageKey); } throw taoLoi(422, 'Không tìm thấy dữ liệu văn bản đầu vào cho AI.', MA_LOI.TEP_KHONG_THE_DOC); }

function laBuocCuoi(context) { const tongSoBuoc = Number(context.tongSoBuoc || 1); const thuTuBuoc = Number(context.thuTuBuoc || tongSoBuoc); return thuTuBuoc >= tongSoBuoc; }

async function coHoTro() { aiService.khoiTaoProviderMacDinh(); return aiService.layDanhSachProvider().length > 0; }

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
            boXuLy: 'ai'
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

async function xuLyAiVanBan(context) {
    await context.kiemTraHuy();
    await context.capNhatTienTrinh(5);
    const input = await docBufferDauVao(context.dauVao);
    const vanBan = input.toString('utf8');
    await context.capNhatTienTrinh(15);
    const ketQua = await aiService.xuLyVanBan({
        vanBan,
        loaiChuyenDoi: context.loaiChuyenDoi,
        chiDan: context.tuyChon.chiDan || null,
        provider: context.tuyChon.provider || null,
        tuyChon: context.tuyChon,
        signal: context.signal
    });
    await context.kiemTraHuy();
    await context.capNhatTienTrinh(90);
    const output = Buffer.from(ketQua.vanBan, 'utf8');
    const dauRa = await taoDauRa(context, output, {
        provider: ketQua.provider,
        model: ketQua.model
    });
    return {
        boXuLy: 'AI',
        congCu: ketQua.provider || 'ai-provider',
        phienBanCongCu: ketQua.model || null,
        dauRa,
        dinhDangDich: DINH_DANG.TXT,
        thongKe: ketQua.thongKe
    };
}

function dangKyNeuChuaCo(converter) { const daCo = transformEngine.layConverter(converter.key); if (daCo) { return daCo; } return transformEngine.dangKyConverter(converter); }

function dangKyTatCa() {
    return Object.freeze([
        dangKyNeuChuaCo({
            key: 'ai:text-transform',
            ten: 'Xử lý văn bản bằng AI provider',
            loaiChuyenDoi: LOAI_AI_VAN_BAN,
            nhomXuLy: '*',
            dinhDangNguon: DINH_DANG.TXT,
            dinhDangDich: DINH_DANG.TXT,
            uuTien: 100,
            chiPhi: 3,
            engine: 'ai-provider',
            phienBanEngine: null,
            hoTro: coHoTro,
            xuLy: xuLyAiVanBan
        })
    ]);
}

const converters = dangKyTatCa();

module.exports = {
    LOAI_AI_VAN_BAN,
    converters,
    dangKyTatCa,
    docBufferDauVao,
    xuLyAiVanBan
};