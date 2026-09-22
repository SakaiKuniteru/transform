'use strict';

const { DINH_DANG } = require('../../../constants/dinh-dang-tep');
const { LOAI_CHUYEN_DOI } = require('../../../constants/loai-chuyen-doi');
const MA_LOI = require('../../../constants/ma-loi');
const { taoLoiTheoStatus: taoLoi } = require('../../../utils/loi');
const storageService = require('../../../infrastructure/storage/storage.service');
const transformEngine = require('../engine/transform-engine.service');
const vanBanService = require('./van-ban.service');
const bangService = require('./bang.service');
const metadataService = require('./metadata.service');

function layStorageKey(dauVao) { return dauVao?.storageKey || dauVao?.khoa || dauVao?.khoaLuuTru || dauVao?.storage?.khoa || dauVao?.storage?.storageKey || dauVao?.phienBan?.storageKey || dauVao?.phienBanHienTai?.storageKey || null; }

async function docBufferDauVao(dauVao) { if (Buffer.isBuffer(dauVao)) { return dauVao; } if (Buffer.isBuffer(dauVao?.buffer)) { return dauVao.buffer; } const storageKey = layStorageKey(dauVao); if (storageKey) { return storageService.docBuffer(storageKey); } throw taoLoi(422, 'Không tìm thấy dữ liệu nguồn để trích xuất.', MA_LOI.TEP_KHONG_THE_DOC); }

function laBuocCuoi(context) { const tongSoBuoc = Number(context.tongSoBuoc || 1); const thuTuBuoc = Number(context.thuTuBuoc || tongSoBuoc); return thuTuBuoc >= tongSoBuoc; }

async function taoDauRa(context, buffer, dinhDang, mimeType, metadata = {}) {
    const thongTin = { dinhDang, mimeType, kichThuocBytes: buffer.length, metadata };
    if (!laBuocCuoi(context)) { return { ...thongTin, buffer }; }
    const khoa = storageService.taoKhoaLuuTru({ loai: storageService.LOAI_THU_MUC.OUTPUT, tenTep: `ket-qua.${dinhDang}` });
    const storage = await storageService.luuTuBuffer(khoa, buffer, { contentType: mimeType, metadata: { congViecId: context.congViecId ? String(context.congViecId) : '', buocId: context.buocId ? String(context.buocId) : '', dinhDang, boXuLy: 'trich-xuat' } });
    return { ...thongTin, storageKey: storage.khoa, storageDriver: storage.driver, storageBucket: storage.bucket, storageEtag: storage.etag };
}

async function xuLy(context) {
    await context.kiemTraHuy();
    await context.capNhatTienTrinh(5);
    const input = await docBufferDauVao(context.dauVao);
    const dinhDangNguon = context.dinhDangNguon;
    const dinhDangDich = context.dinhDangDich;
    const kieu = String(context.tuyChon.kieu || (dinhDangDich === DINH_DANG.TXT ? 'VAN_BAN' : 'METADATA')).trim().toUpperCase();
    await context.capNhatTienTrinh(20);
    let buffer;
    let metadata;
    let thongKe;
    let congCu;
    if (kieu === 'VAN_BAN') {
        if (dinhDangDich !== DINH_DANG.TXT) { throw taoLoi(422, 'Trích xuất văn bản yêu cầu định dạng đích TXT.', MA_LOI.DU_LIEU_KHONG_HOP_LE); }
        const result = await vanBanService.trichXuat(input, dinhDangNguon, context.tuyChon);
        buffer = result.buffer;
        metadata = result.metadata;
        thongKe = result.thongKe;
        congCu = result.congCu;
    } else if (kieu === 'BANG') {
        if (dinhDangDich !== DINH_DANG.JSON) { throw taoLoi(422, 'Trích xuất bảng yêu cầu định dạng đích JSON.', MA_LOI.DU_LIEU_KHONG_HOP_LE); }
        const result = await bangService.trichXuat(input, dinhDangNguon, context.tuyChon);
        buffer = Buffer.from(JSON.stringify(result, null, 2), 'utf8');
        metadata = { kieu: 'BANG' };
        thongKe = result.thongKe;
        congCu = result.congCu;
    } else if (kieu === 'METADATA') {
        if (dinhDangDich !== DINH_DANG.JSON) { throw taoLoi(422, 'Trích xuất metadata yêu cầu định dạng đích JSON.', MA_LOI.DU_LIEU_KHONG_HOP_LE); }
        const result = await metadataService.layMetadata(input, { ...context.tuyChon, dinhDang: dinhDangNguon, tenTep: context.dauVao?.tenTep, mimeType: context.dauVao?.mimeType });
        buffer = Buffer.from(JSON.stringify(result, null, 2), 'utf8');
        metadata = { kieu: 'METADATA' };
        thongKe = {};
        congCu = 'transform-metadata';
    } else { throw taoLoi(422, `Kiểu trích xuất "${kieu}" không hợp lệ.`, MA_LOI.DU_LIEU_KHONG_HOP_LE); }
    await context.kiemTraHuy();
    await context.capNhatTienTrinh(90);
    const mimeType = dinhDangDich === DINH_DANG.TXT ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8';
    const dauRa = await taoDauRa(context, buffer, dinhDangDich, mimeType, metadata);
    return { boXuLy: 'TRICH_XUAT', congCu, phienBanCongCu: null, dauRa, dinhDangDich, thongKe };
}

function dangKyNeuChuaCo(converter) { const hienTai = transformEngine.layConverter(converter.key); return hienTai || transformEngine.dangKyConverter(converter); }

function dangKyTatCa() {
    return Object.freeze([
        dangKyNeuChuaCo({
            key: 'trich-xuat:noi-dung',
            ten: 'Trích xuất nội dung tệp',
            loaiChuyenDoi: LOAI_CHUYEN_DOI.TRICH_XUAT,
            nhomXuLy: '*',
            dinhDangNguon: '*',
            dinhDangDich: [DINH_DANG.TXT, DINH_DANG.JSON],
            uuTien: 100,
            chiPhi: 1,
            engine: 'transform-extract',
            phienBanEngine: null,
            xuLy
        })
    ]);
}

const converters = dangKyTatCa();

module.exports = {
    converters,
    dangKyTatCa,
    docBufferDauVao,
    xuLy
};