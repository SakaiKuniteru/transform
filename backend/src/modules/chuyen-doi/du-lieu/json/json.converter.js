'use strict';

const { DINH_DANG, layThongTinDinhDang } = require('../../../../constants/dinh-dang-tep');
const { LOAI_CHUYEN_DOI } = require('../../../../constants/loai-chuyen-doi');
const MA_LOI = require('../../../../constants/ma-loi');
const { taoLoiTheoStatus: taoLoi, laLoiUngDung } = require('../../../../utils/loi');
const storageService = require('../../../../infrastructure/storage/storage.service');
const transformEngine = require('../../engine/transform-engine.service');
const parser = require('./json.parser');
const formatter = require('./json.formatter');

const DINH_DANG_DICH_HO_TRO = Object.freeze([
    DINH_DANG.JSON,
    DINH_DANG.YAML,
    DINH_DANG.YML,
    DINH_DANG.XML,
    DINH_DANG.CSV
]);

function layStorageKey(dauVao) { return dauVao?.storageKey || dauVao?.khoa || dauVao?.khoaLuuTru || dauVao?.storage?.khoa || dauVao?.storage?.storageKey || dauVao?.phienBan?.storageKey || dauVao?.phienBanHienTai?.storageKey || null; }

async function docBufferDauVao(dauVao) {
    if (Buffer.isBuffer(dauVao)) { return dauVao; }
    if (Buffer.isBuffer(dauVao?.buffer)) { return dauVao.buffer; }
    if (typeof dauVao === 'string') { return Buffer.from(dauVao, 'utf8'); }
    if (typeof dauVao?.text === 'string') { return Buffer.from(dauVao.text, 'utf8'); }
    const storageKey = layStorageKey(dauVao);
    if (storageKey) { return storageService.docBuffer(storageKey); }
    throw taoLoi(422, 'Không tìm thấy dữ liệu JSON đầu vào.', MA_LOI.TEP_KHONG_THE_DOC);
}

function laBuocCuoi(context) { const tongSoBuoc = Number(context.tongSoBuoc || 1); const thuTuBuoc = Number(context.thuTuBuoc || tongSoBuoc); return thuTuBuoc >= tongSoBuoc; }

function chuanHoaLoiJson(error) {
    if (laLoiUngDung(error)) { return error; }
    if (error instanceof RangeError) { return taoLoi(413, error.message, MA_LOI.TEP_VUOT_KICH_THUOC); }
    if (error instanceof TypeError) { return taoLoi(422, error.message, MA_LOI.DU_LIEU_KHONG_HOP_LE); }
    return error;
}

async function taoDauRa(context, ketQua, metadata = {}) {
    const thongTin = { dinhDang: ketQua.dinhDang, mimeType: ketQua.mimeType, kichThuocBytes: ketQua.kichThuocBytes, metadata };
    if (!laBuocCuoi(context)) { return { ...thongTin, buffer: ketQua.buffer }; }
    await context.kiemTraHuy();
    const extension = layThongTinDinhDang(ketQua.dinhDang)?.extensions?.[0] || ketQua.dinhDang || 'txt';
    const khoa = storageService.taoKhoaLuuTru({ loai: storageService.LOAI_THU_MUC.OUTPUT, tenTep: `ket-qua.${extension}` });
    const storage = await storageService.luuTuBuffer(khoa, ketQua.buffer, { contentType: ketQua.mimeType, metadata: { congViecId: context.congViecId ? String(context.congViecId) : '', buocId: context.buocId ? String(context.buocId) : '', dinhDang: ketQua.dinhDang, boXuLy: 'json' } });
    return { ...thongTin, storageKey: storage.khoa, storageDriver: storage.driver, storageBucket: storage.bucket, storageEtag: storage.etag };
}

async function xuLy(context) {
    try {
        await context.kiemTraHuy();
        await context.capNhatTienTrinh(5);
        const input = await docBufferDauVao(context.dauVao);
        await context.capNhatTienTrinh(25);
        const daParse = parser.parse(input, context.tuyChon);
        await context.kiemTraHuy();
        await context.capNhatTienTrinh(55);
        const ketQua = formatter.format(daParse.giaTri, context.dinhDangDich, context.tuyChon);
        await context.capNhatTienTrinh(90);
        const dauRa = await taoDauRa(context, ketQua, { dinhDangNguon: DINH_DANG.JSON, soNode: daParse.thongKe?.soNode ?? null, doSauLonNhat: daParse.thongKe?.doSauLonNhat ?? null });
        return { boXuLy: 'DU_LIEU', congCu: 'transform-json', phienBanCongCu: null, dauRa, dinhDangDich: ketQua.dinhDang, thongKe: { ...daParse.thongKe, kichThuocNguonBytes: daParse.kichThuocBytes, kichThuocDichBytes: ketQua.kichThuocBytes } };
    } catch (error) { throw chuanHoaLoiJson(error); }
}

function dangKyNeuChuaCo(converter) { const hienTai = transformEngine.layConverter(converter.key); return hienTai || transformEngine.dangKyConverter(converter); }

function dangKyTatCa() {
    return Object.freeze([
        dangKyNeuChuaCo({
            key: 'json:chuyen-dinh-dang',
            ten: 'Chuyển đổi dữ liệu JSON',
            loaiChuyenDoi: LOAI_CHUYEN_DOI.CHUYEN_DINH_DANG,
            nhomXuLy: 'DU_LIEU',
            dinhDangNguon: DINH_DANG.JSON,
            dinhDangDich: DINH_DANG_DICH_HO_TRO,
            uuTien: 100,
            chiPhi: 1,
            engine: 'transform-json',
            phienBanEngine: null,
            xuLy
        })
    ]);
}

const converters = dangKyTatCa();

module.exports = {
    DINH_DANG_DICH_HO_TRO,
    converters,
    dangKyTatCa,
    docBufferDauVao,
    xuLy
};