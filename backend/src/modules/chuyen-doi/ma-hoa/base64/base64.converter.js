'use strict';

const { DINH_DANG, layThongTinDinhDang } = require('../../../../constants/dinh-dang-tep');
const { LOAI_CHUYEN_DOI } = require('../../../../constants/loai-chuyen-doi');
const MA_LOI = require('../../../../constants/ma-loi');
const { taoLoiTheoStatus: taoLoi } = require('../../../../utils/loi');
const storageService = require('../../../../infrastructure/storage/storage.service');
const transformEngine = require('../../engine/transform-engine.service');
const dinhDangService = require('../../nhan-dien/dinh-dang.service');
const encodingService = require('../../nhan-dien/encoding.service');
const encoder = require('./base64.encoder');
const decoder = require('./base64.decoder');

function layStorageKey(dauVao) { return dauVao?.storageKey || dauVao?.khoa || dauVao?.khoaLuuTru || dauVao?.storage?.khoa || dauVao?.storage?.storageKey || dauVao?.phienBan?.storageKey || dauVao?.phienBanHienTai?.storageKey || null; }

async function docBufferDauVao(dauVao) { if (Buffer.isBuffer(dauVao)) { return dauVao; } if (Buffer.isBuffer(dauVao?.buffer)) { return dauVao.buffer; } const storageKey = layStorageKey(dauVao); if (storageKey) { return storageService.docBuffer(storageKey); } throw taoLoi(422, 'Không tìm thấy dữ liệu Base64 đầu vào.', MA_LOI.TEP_KHONG_THE_DOC); }

function laBuocCuoi(context) { const tongSoBuoc = Number(context.tongSoBuoc || 1); const thuTuBuoc = Number(context.thuTuBuoc || tongSoBuoc); return thuTuBuoc >= tongSoBuoc; }

function layMimeType(dinhDang) { return layThongTinDinhDang(dinhDang)?.mimeTypes?.[0] || 'application/octet-stream'; }

async function taoDauRa(context, buffer, dinhDang, mimeType, metadata = {}) {
    const thongTin = { dinhDang, mimeType, kichThuocBytes: buffer.length, metadata };
    if (!laBuocCuoi(context)) { return { ...thongTin, buffer }; }
    const extension = layThongTinDinhDang(dinhDang)?.extensions?.[0] || dinhDang || 'bin';
    const khoa = storageService.taoKhoaLuuTru({ loai: storageService.LOAI_THU_MUC.OUTPUT, tenTep: `ket-qua.${extension}` });
    const storage = await storageService.luuTuBuffer(khoa, buffer, { contentType: mimeType, metadata: { congViecId: context.congViecId ? String(context.congViecId) : '', buocId: context.buocId ? String(context.buocId) : '', dinhDang, boXuLy: 'base64' } });
    return { ...thongTin, storageKey: storage.khoa, storageDriver: storage.driver, storageBucket: storage.bucket, storageEtag: storage.etag };
}

async function xuLyMaHoa(context) {
    await context.kiemTraHuy();
    await context.capNhatTienTrinh(10);
    const input = await docBufferDauVao(context.dauVao);
    const result = encoder.encode(input, { ...context.tuyChon, mimeType: context.dauVao?.mimeType || layMimeType(context.dinhDangNguon) });
    await context.capNhatTienTrinh(90);
    const dauRa = await taoDauRa(context, result.buffer, DINH_DANG.BASE64, 'text/plain; charset=us-ascii', { dinhDangNguon: context.dinhDangNguon, ...result.metadata });
    return { boXuLy: 'MA_HOA', congCu: 'node:buffer-base64', phienBanCongCu: process.version, dauRa, dinhDangDich: DINH_DANG.BASE64, thongKe: result.thongKe };
}

async function hoTroGiaiMa(context = {}) { return Boolean(context.dinhDangDich && context.dinhDangDich !== DINH_DANG.BASE64); }

function xacMinhDinhDang(buffer, dinhDangDich) {
    const thongTin = layThongTinDinhDang(dinhDangDich);
    if (!thongTin) { throw taoLoi(415, 'Định dạng sau giải mã không được hỗ trợ.', MA_LOI.TEP_DINH_DANG_KHONG_HO_TRO); }
    if (thongTin.binary === false) {
        const encoding = encodingService.nhanDienEncoding(buffer);
        if (!encoding.laVanBan) { throw taoLoi(422, `Dữ liệu Base64 sau giải mã không phải "${dinhDangDich}" dạng văn bản hợp lệ.`, MA_LOI.TEP_KHONG_HOP_LE); }
        return { dinhDang: dinhDangDich, nhanDien: null };
    }
    const nhanDien = dinhDangService.nhanDienTuBuffer(buffer, { coToanBoBuffer: true });
    if (!dinhDangService.laTuongDuong(nhanDien.dinhDang, dinhDangDich)) { throw taoLoi(422, `Dữ liệu Base64 thực tế là "${nhanDien.dinhDang || 'không xác định'}", không khớp "${dinhDangDich}".`, MA_LOI.TEP_KHONG_HOP_LE); }
    return { dinhDang: dinhDangDich, nhanDien };
}

async function xuLyGiaiMa(context) {
    await context.kiemTraHuy();
    await context.capNhatTienTrinh(10);
    const input = await docBufferDauVao(context.dauVao);
    const result = decoder.decode(input, context.tuyChon);
    const xacMinh = xacMinhDinhDang(result.buffer, context.dinhDangDich);
    await context.capNhatTienTrinh(90);
    const dauRa = await taoDauRa(context, result.buffer, xacMinh.dinhDang, layMimeType(xacMinh.dinhDang), { nhanDien: xacMinh.nhanDien, ...result.metadata });
    return { boXuLy: 'MA_HOA', congCu: 'node:buffer-base64', phienBanCongCu: process.version, dauRa, dinhDangDich: xacMinh.dinhDang, thongKe: result.thongKe };
}

function dangKyNeuChuaCo(converter) { const hienTai = transformEngine.layConverter(converter.key); return hienTai || transformEngine.dangKyConverter(converter); }

function dangKyTatCa() {
    return Object.freeze([
        dangKyNeuChuaCo({
            key: 'base64:ma-hoa',
            ten: 'Mã hóa dữ liệu Base64',
            loaiChuyenDoi: LOAI_CHUYEN_DOI.MA_HOA,
            nhomXuLy: 'MA_HOA',
            dinhDangNguon: '*',
            dinhDangDich: DINH_DANG.BASE64,
            uuTien: 100,
            chiPhi: 1,
            engine: 'node:buffer-base64',
            phienBanEngine: process.version,
            xuLy: xuLyMaHoa
        }),
        dangKyNeuChuaCo({
            key: 'base64:giai-ma',
            ten: 'Giải mã dữ liệu Base64',
            loaiChuyenDoi: LOAI_CHUYEN_DOI.GIAI_MA,
            nhomXuLy: 'MA_HOA',
            dinhDangNguon: DINH_DANG.BASE64,
            dinhDangDich: '*',
            uuTien: 100,
            chiPhi: 1,
            engine: 'node:buffer-base64',
            phienBanEngine: process.version,
            hoTro: hoTroGiaiMa,
            xuLy: xuLyGiaiMa
        })
    ]);
}

const converters = dangKyTatCa();

module.exports = {
    converters,
    dangKyTatCa,
    docBufferDauVao,
    xuLyMaHoa,
    xuLyGiaiMa
};