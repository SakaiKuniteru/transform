'use strict';

const { DINH_DANG } = require('../../../constants/dinh-dang-tep');
const MA_LOI = require('../../../constants/ma-loi');
const { taoLoiTheoStatus: taoLoi } = require('../../../utils/loi');
const metadataService = require('./hinh-anh.metadata');

function chuanHoaDinhDangHinhAnh(value) {
    const format = String(value || '').trim().toLowerCase();
    if (format === DINH_DANG.JPG || format === DINH_DANG.JPEG) { return DINH_DANG.JPEG; }
    if ([DINH_DANG.PNG, DINH_DANG.WEBP].includes(format)) { return format; }
    throw taoLoi(415, `Định dạng hình ảnh "${format || 'không xác định'}" chưa được hỗ trợ.`, MA_LOI.TEP_DINH_DANG_KHONG_HO_TRO);
}

function soNguyenTrongKhoang(value, ten, min, max, macDinh) {
    if (value === undefined || value === null || value === '') { return macDinh; }
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < min || number > max) { throw taoLoi(400, `${ten} phải nằm trong khoảng ${min}-${max}.`, MA_LOI.CHUYEN_DOI_KHONG_HO_TRO); }
    return number;
}

function apDungMetadata(pipeline, options = {}) {
    if (options.giuMetadata === true || options.keepMetadata === true) { return pipeline.withMetadata(); }
    return pipeline;
}

function apDungDinhDangDauRa(pipeline, dinhDang, options = {}) {
    const format = chuanHoaDinhDangHinhAnh(dinhDang);
    if (format === DINH_DANG.PNG) {
        return pipeline.png({
            compressionLevel: soNguyenTrongKhoang(options.mucNen ?? options.compressionLevel, 'Mức nén PNG', 0, 9, 9),
            adaptiveFiltering: options.adaptiveFiltering !== false,
            palette: options.palette === true,
            quality: soNguyenTrongKhoang(options.chatLuong ?? options.quality, 'Chất lượng PNG', 1, 100, 100),
            effort: soNguyenTrongKhoang(options.effort, 'Effort PNG', 1, 10, 7)
        });
    }
    if (format === DINH_DANG.JPEG) {
        return pipeline.flatten({ background: options.mauNen ?? options.background ?? '#ffffff' }).jpeg({
            quality: soNguyenTrongKhoang(options.chatLuong ?? options.quality, 'Chất lượng JPEG', 1, 100, 85),
            progressive: options.progressive !== false,
            mozjpeg: options.mozjpeg !== false,
            chromaSubsampling: options.chromaSubsampling || '4:2:0',
            optimiseCoding: options.optimiseCoding !== false
        });
    }
    return pipeline.webp({
        quality: soNguyenTrongKhoang(options.chatLuong ?? options.quality, 'Chất lượng WebP', 1, 100, 82),
        effort: soNguyenTrongKhoang(options.effort, 'Effort WebP', 0, 6, 4),
        lossless: options.lossless === true,
        nearLossless: options.nearLossless === true,
        smartSubsample: options.smartSubsample !== false
    });
}

async function xuatHinhAnh(pipeline, dinhDang, options = {}) {
    if (!pipeline || typeof pipeline.toBuffer !== 'function') { throw new TypeError('Sharp pipeline không hợp lệ.'); }
    try {
        const format = chuanHoaDinhDangHinhAnh(dinhDang);
        let output = apDungMetadata(pipeline, options);
        output = apDungDinhDangDauRa(output, format, options);
        const { data, info } = await output.toBuffer({ resolveWithObject: true });
        return {
            buffer: data,
            info,
            dinhDang: format,
            mimeType: metadataService.layMimeType(format),
            kichThuocBytes: data.length
        };
    } catch (error) {
        if (error?.statusCode) { throw error; }
        throw taoLoi(422, 'Không thể mã hóa hình ảnh đầu ra.', MA_LOI.CHUYEN_DOI_THAT_BAI, null, {
            cause: error?.message || null
        });
    }
}

module.exports = {
    chuanHoaDinhDangHinhAnh,
    apDungMetadata,
    apDungDinhDangDauRa,
    xuatHinhAnh
};