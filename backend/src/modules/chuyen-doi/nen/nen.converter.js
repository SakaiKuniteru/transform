'use strict';

const { DINH_DANG } = require('../../../constants/dinh-dang-tep');
const { LOAI_CHUYEN_DOI } = require('../../../constants/loai-chuyen-doi');
const MA_LOI = require('../../../constants/ma-loi');
const { taoLoiTheoStatus: taoLoi } = require('../../../utils/loi');
const storageService = require('../../../infrastructure/storage/storage.service');
const transformEngine = require('../engine/transform-engine.service');
const gzipCompress = require('./gzip/gzip.compress');
const gzipExtract = require('./gzip/gzip.extract');

function layStorageKey(dauVao) { return dauVao?.storageKey || dauVao?.khoa || dauVao?.khoaLuuTru || dauVao?.storage?.khoa || dauVao?.storage?.storageKey || dauVao?.phienBan?.storageKey || dauVao?.phienBanHienTai?.storageKey || null; }

async function docBufferDauVao(dauVao) { if (Buffer.isBuffer(dauVao)) { return dauVao; } if (Buffer.isBuffer(dauVao?.buffer)) { return dauVao.buffer; } const storageKey = layStorageKey(dauVao); if (storageKey) { return storageService.docBuffer(storageKey); } throw taoLoi(422, 'Không tìm thấy dữ liệu đầu vào để nén/giải nén.', MA_LOI.TEP_KHONG_THE_DOC); }

function laBuocCuoi(context) { const tongSoBuoc = Number(context.tongSoBuoc || 1); const thuTuBuoc = Number(context.thuTuBuoc || tongSoBuoc); return thuTuBuoc >= tongSoBuoc; }

function layExtension(dinhDang) { return dinhDang === DINH_DANG.GZIP ? 'gz' : dinhDang || 'bin'; }

async function taoDauRa(context, ketQua) {
    const thongTin = { dinhDang: ketQua.dinhDang, mimeType: ketQua.mimeType, kichThuocBytes: ketQua.kichThuocBytes, metadata: ketQua.metadata || {} };
    if (!laBuocCuoi(context)) { return { ...thongTin, buffer: ketQua.buffer }; }
    const khoa = storageService.taoKhoaLuuTru({ loai: storageService.LOAI_THU_MUC.OUTPUT, tenTep: `ket-qua.${layExtension(ketQua.dinhDang)}` });
    const storage = await storageService.luuTuBuffer(khoa, ketQua.buffer, { contentType: ketQua.mimeType, metadata: { congViecId: context.congViecId ? String(context.congViecId) : '', buocId: context.buocId ? String(context.buocId) : '', dinhDang: ketQua.dinhDang, boXuLy: 'gzip' } });
    return { ...thongTin, storageKey: storage.khoa, storageDriver: storage.driver, storageBucket: storage.bucket, storageEtag: storage.etag };
}

async function xuLyNenGzip(context) {
    await context.kiemTraHuy();
    await context.capNhatTienTrinh(5);
    const buffer = await docBufferDauVao(context.dauVao);
    await context.capNhatTienTrinh(30);
    const ketQua = await gzipCompress.nen(buffer, context.tuyChon);
    await context.kiemTraHuy();
    await context.capNhatTienTrinh(90);
    const dauRa = await taoDauRa(context, ketQua);
    return { boXuLy: 'NEN', congCu: 'node:zlib', phienBanCongCu: process.versions.zlib || null, dauRa, dinhDangDich: DINH_DANG.GZIP, thongKe: ketQua.thongKe };
}

async function xuLyGiaiNenGzip(context) {
    await context.kiemTraHuy();
    await context.capNhatTienTrinh(5);
    const buffer = await docBufferDauVao(context.dauVao);
    await context.capNhatTienTrinh(30);
    const ketQua = await gzipExtract.giaiNen(buffer, { ...context.tuyChon, tenTepNguon: context.dauVao?.tenTep || context.tuyChon?.tenTepNguon });
    await context.kiemTraHuy();
    await context.capNhatTienTrinh(90);
    const dauRa = await taoDauRa(context, ketQua);
    return { boXuLy: 'NEN', congCu: 'node:zlib', phienBanCongCu: process.versions.zlib || null, dauRa, dinhDangDich: ketQua.dinhDang, thongKe: ketQua.thongKe };
}

function dangKyNeuChuaCo(converter) { const daCo = transformEngine.layConverter(converter.key); if (daCo) { return daCo; } return transformEngine.dangKyConverter(converter); }

function dangKyTatCa() {
    return Object.freeze([
        dangKyNeuChuaCo({
            key: 'gzip:nen',
            ten: 'Nén dữ liệu bằng GZIP',
            loaiChuyenDoi: LOAI_CHUYEN_DOI.NEN,
            nhomXuLy: 'TEP_NEN',
            dinhDangNguon: '*',
            dinhDangDich: DINH_DANG.GZIP,
            uuTien: 100,
            chiPhi: 1,
            engine: 'node:zlib',
            phienBanEngine: process.versions.zlib || null,
            xuLy: xuLyNenGzip
        }),
        dangKyNeuChuaCo({
            key: 'gzip:giai-nen',
            ten: 'Giải nén dữ liệu GZIP',
            loaiChuyenDoi: LOAI_CHUYEN_DOI.GIAI_NEN,
            nhomXuLy: 'TEP_NEN',
            dinhDangNguon: DINH_DANG.GZIP,
            dinhDangDich: '*',
            uuTien: 100,
            chiPhi: 1,
            engine: 'node:zlib',
            phienBanEngine: process.versions.zlib || null,
            xuLy: xuLyGiaiNenGzip
        })
    ]);
}

const converters = dangKyTatCa();

module.exports = {
    converters,
    dangKyTatCa,
    docBufferDauVao,
    xuLyNenGzip,
    xuLyGiaiNenGzip
};