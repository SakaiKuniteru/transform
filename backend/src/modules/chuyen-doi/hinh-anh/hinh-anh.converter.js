'use strict';

const sharp = require('sharp');
const { DINH_DANG } = require('../../../constants/dinh-dang-tep');
const { LOAI_CHUYEN_DOI } = require('../../../constants/loai-chuyen-doi');
const MA_LOI = require('../../../constants/ma-loi');
const { taoLoiTheoStatus: taoLoi } = require('../../../utils/loi');
const storageService = require('../../../infrastructure/storage/storage.service');
const transformEngine = require('../engine/transform-engine.service');
const metadataService = require('./hinh-anh.metadata');
const resizeService = require('./hinh-anh.resize');
const optimizeService = require('./hinh-anh.optimize');

const DINH_DANG_HO_TRO = Object.freeze([
    DINH_DANG.PNG,
    DINH_DANG.JPG,
    DINH_DANG.JPEG,
    DINH_DANG.WEBP
]);

const PHIEN_BAN_SHARP = sharp.versions.sharp;

function layStorageKey(dauVao) {
    return dauVao?.storageKey || dauVao?.khoa || dauVao?.khoaLuuTru || dauVao?.storage?.khoa || dauVao?.storage?.storageKey || dauVao?.phienBan?.storageKey || dauVao?.phienBanHienTai?.storageKey || null;
}

async function docBufferDauVao(dauVao) {
    if (Buffer.isBuffer(dauVao)) { return dauVao; }
    if (Buffer.isBuffer(dauVao?.buffer)) { return dauVao.buffer; }
    const storageKey = layStorageKey(dauVao);
    if (storageKey) { return storageService.docBuffer(storageKey); }
    throw taoLoi(422, 'Không tìm thấy dữ liệu hình ảnh đầu vào.', MA_LOI.TEP_KHONG_THE_DOC);
}

function laBuocCuoi(context) {
    const tongSoBuoc = Number(context.tongSoBuoc || 1);
    const thuTuBuoc = Number(context.thuTuBuoc || tongSoBuoc);
    return thuTuBuoc >= tongSoBuoc;
}

function chonDinhDangDauRa(context, metadata, batBuocDich = false) {
    const dich = context.dinhDangDich ? String(context.dinhDangDich).trim().toLowerCase() : null;
    if (batBuocDich && !dich) { throw taoLoi(400, 'Thiếu định dạng hình ảnh đích.', MA_LOI.CHUYEN_DOI_KHONG_HO_TRO); }
    const format = dich || context.dinhDangNguon || metadata.dinhDang;
    if (!DINH_DANG_HO_TRO.includes(format)) { throw taoLoi(415, `Định dạng hình ảnh đích "${format || 'không xác định'}" chưa được hỗ trợ.`, MA_LOI.TEP_DINH_DANG_KHONG_HO_TRO); }
    return format;
}

function taoPipeline(buffer, options = {}) {
    let pipeline = sharp(buffer, {
        failOn: 'error',
        sequentialRead: true
    });
    if (options.tuDongXoay !== false && options.autoOrient !== false) { pipeline = pipeline.rotate(); }
    return pipeline;
}

async function taoDauRa(context, ketQua, metadata) {
    const thongTin = {
        dinhDang: ketQua.dinhDang,
        mimeType: ketQua.mimeType,
        kichThuocBytes: ketQua.kichThuocBytes,
        metadata: {
            chieuRong: ketQua.info?.width ?? null,
            chieuCao: ketQua.info?.height ?? null,
            soKenh: ketQua.info?.channels ?? null,
            dinhDangNguon: metadata.dinhDang
        }
    };
    if (!laBuocCuoi(context)) {
        return {
            ...thongTin,
            buffer: ketQua.buffer
        };
    }
    const extension = ketQua.dinhDang === DINH_DANG.JPEG ? 'jpg' : ketQua.dinhDang;
    const khoa = storageService.taoKhoaLuuTru({
        loai: storageService.LOAI_THU_MUC.OUTPUT,
        tenTep: `ket-qua.${extension}`
    });
    const storage = await storageService.luuTuBuffer(khoa, ketQua.buffer, {
        contentType: ketQua.mimeType,
        metadata: {
            congViecId: context.congViecId ? String(context.congViecId) : '',
            buocId: context.buocId ? String(context.buocId) : '',
            dinhDang: ketQua.dinhDang,
            boXuLy: 'sharp'
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

async function xuLyPipeline(context, taoBienDoi, batBuocDich = false) {
    await context.kiemTraHuy();
    await context.capNhatTienTrinh(5);
    const buffer = await docBufferDauVao(context.dauVao);
    const metadata = await metadataService.batBuocHinhAnhHoTro(buffer);
    const dinhDangDauRa = chonDinhDangDauRa(context, metadata, batBuocDich);
    await context.capNhatTienTrinh(20);
    let pipeline = taoPipeline(buffer, context.tuyChon);
    pipeline = await taoBienDoi(pipeline, context.tuyChon, metadata);
    await context.kiemTraHuy();
    await context.capNhatTienTrinh(70);
    const ketQua = await optimizeService.xuatHinhAnh(pipeline, dinhDangDauRa, context.tuyChon);
    await context.capNhatTienTrinh(90);
    const dauRa = await taoDauRa(context, ketQua, metadata);
    return {
        boXuLy: 'HINH_ANH',
        congCu: 'sharp',
        phienBanCongCu: PHIEN_BAN_SHARP,
        dauRa,
        thongKe: {
            kichThuocNguonBytes: buffer.length,
            kichThuocDichBytes: ketQua.kichThuocBytes,
            chieuRongNguon: metadata.chieuRong,
            chieuCaoNguon: metadata.chieuCao,
            chieuRongDich: ketQua.info?.width ?? null,
            chieuCaoDich: ketQua.info?.height ?? null
        }
    };
}

async function xuLyChuyenDinhDang(context) { return xuLyPipeline(context, async (pipeline) => pipeline, true); }

async function xuLyDoiKichThuoc(context) { return xuLyPipeline(context, async (pipeline, options) => resizeService.apDungResize(pipeline, options)); }

async function xuLyToiUu(context) { return xuLyPipeline(context, async (pipeline) => pipeline); }

async function xuLyXoay(context) { return xuLyPipeline(context, async (pipeline, options) => resizeService.apDungXoay(pipeline, options)); }

async function xuLyCat(context) { return xuLyPipeline(context, async (pipeline, options, metadata) => resizeService.apDungCat(pipeline, options, metadata)); }

function dangKyNeuChuaCo(converter) {
    const daCo = transformEngine.layConverter(converter.key);
    if (daCo) { return daCo; }
    return transformEngine.dangKyConverter(converter);
}

function dangKyTatCa() {
    return Object.freeze([
        dangKyNeuChuaCo({
            key: 'sharp:chuyen-dinh-dang-hinh-anh',
            ten: 'Chuyển đổi định dạng hình ảnh bằng Sharp',
            loaiChuyenDoi: LOAI_CHUYEN_DOI.CHUYEN_DINH_DANG,
            nhomXuLy: 'HINH_ANH',
            dinhDangNguon: DINH_DANG_HO_TRO,
            dinhDangDich: DINH_DANG_HO_TRO,
            uuTien: 100,
            chiPhi: 1,
            engine: 'sharp',
            phienBanEngine: PHIEN_BAN_SHARP,
            xuLy: xuLyChuyenDinhDang
        }),
        dangKyNeuChuaCo({
            key: 'sharp:doi-kich-thuoc',
            ten: 'Đổi kích thước hình ảnh bằng Sharp',
            loaiChuyenDoi: LOAI_CHUYEN_DOI.DOI_KICH_THUOC,
            nhomXuLy: 'HINH_ANH',
            dinhDangNguon: DINH_DANG_HO_TRO,
            dinhDangDich: '*',
            uuTien: 100,
            chiPhi: 1,
            engine: 'sharp',
            phienBanEngine: PHIEN_BAN_SHARP,
            xuLy: xuLyDoiKichThuoc
        }),
        dangKyNeuChuaCo({
            key: 'sharp:toi-uu-hinh-anh',
            ten: 'Tối ưu hình ảnh bằng Sharp',
            loaiChuyenDoi: LOAI_CHUYEN_DOI.TOI_UU_HINH_ANH,
            nhomXuLy: 'HINH_ANH',
            dinhDangNguon: DINH_DANG_HO_TRO,
            dinhDangDich: '*',
            uuTien: 100,
            chiPhi: 1,
            engine: 'sharp',
            phienBanEngine: PHIEN_BAN_SHARP,
            xuLy: xuLyToiUu
        }),
        dangKyNeuChuaCo({
            key: 'sharp:xoay-hinh-anh',
            ten: 'Xoay hình ảnh bằng Sharp',
            loaiChuyenDoi: LOAI_CHUYEN_DOI.XOAY,
            nhomXuLy: 'HINH_ANH',
            dinhDangNguon: DINH_DANG_HO_TRO,
            dinhDangDich: '*',
            uuTien: 100,
            chiPhi: 1,
            engine: 'sharp',
            phienBanEngine: PHIEN_BAN_SHARP,
            xuLy: xuLyXoay
        }),
        dangKyNeuChuaCo({
            key: 'sharp:cat-hinh-anh',
            ten: 'Cắt hình ảnh bằng Sharp',
            loaiChuyenDoi: LOAI_CHUYEN_DOI.CAT,
            nhomXuLy: 'HINH_ANH',
            dinhDangNguon: DINH_DANG_HO_TRO,
            dinhDangDich: '*',
            uuTien: 100,
            chiPhi: 1,
            engine: 'sharp',
            phienBanEngine: PHIEN_BAN_SHARP,
            xuLy: xuLyCat
        })
    ]);
}

const converters = dangKyTatCa();

module.exports = {
    DINH_DANG_HO_TRO,
    PHIEN_BAN_SHARP,
    converters,
    dangKyTatCa,
    docBufferDauVao,
    xuLyChuyenDinhDang,
    xuLyDoiKichThuoc,
    xuLyToiUu,
    xuLyXoay,
    xuLyCat
};