'use strict';

const sharp = require('sharp');
const MA_LOI = require('../../../constants/ma-loi');
const { DINH_DANG } = require('../../../constants/dinh-dang-tep');
const { taoLoiTheoStatus: taoLoi } = require('../../../utils/loi');

const DINH_DANG_HINH_ANH = Object.freeze([
    DINH_DANG.PNG,
    DINH_DANG.JPG,
    DINH_DANG.JPEG,
    DINH_DANG.WEBP
]);

function batBuocBuffer(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) { throw taoLoi(422, 'Dữ liệu hình ảnh không hợp lệ.', MA_LOI.TEP_BI_HONG); }
    return buffer;
}

function chuanHoaDinhDangSharp(value) {
    const format = String(value || '').trim().toLowerCase();
    if (format === 'jpg' || format === 'jpeg') { return DINH_DANG.JPEG; }
    if (format === 'png') { return DINH_DANG.PNG; }
    if (format === 'webp') { return DINH_DANG.WEBP; }
    return format || null;
}

function layMimeType(value) {
    const format = chuanHoaDinhDangSharp(value);
    if (format === DINH_DANG.PNG) { return 'image/png'; }
    if (format === DINH_DANG.JPEG) { return 'image/jpeg'; }
    if (format === DINH_DANG.WEBP) { return 'image/webp'; }
    return 'application/octet-stream';
}

function chuanHoaMetadata(metadata, kichThuocBytes) {
    const dinhDang = chuanHoaDinhDangSharp(metadata?.format);
    return {
        dinhDang,
        mimeType: layMimeType(dinhDang),
        kichThuocBytes,
        chieuRong: metadata?.width ?? null,
        chieuCao: metadata?.height ?? null,
        soKenh: metadata?.channels ?? null,
        depth: metadata?.depth ?? null,
        colorSpace: metadata?.space ?? null,
        density: metadata?.density ?? null,
        coAlpha: metadata?.hasAlpha ?? false,
        orientation: metadata?.orientation ?? null,
        soTrang: metadata?.pages ?? 1,
        delay: metadata?.delay ?? null,
        loop: metadata?.loop ?? null,
        isProgressive: metadata?.isProgressive ?? false,
        isPalette: metadata?.isPalette ?? false
    };
}

async function docMetadata(buffer) {
    batBuocBuffer(buffer);
    try {
        const metadata = await sharp(buffer, { failOn: 'error', sequentialRead: true }).metadata();
        return chuanHoaMetadata(metadata, buffer.length);
    } catch (error) {
        throw taoLoi(422, 'Không thể đọc metadata hình ảnh.', MA_LOI.TEP_BI_HONG, null, {
            cause: error?.message || null
        });
    }
}

async function batBuocHinhAnhHoTro(buffer) {
    const metadata = await docMetadata(buffer);
    if (!DINH_DANG_HINH_ANH.includes(metadata.dinhDang)) { throw taoLoi(415, `Định dạng hình ảnh "${metadata.dinhDang || 'không xác định'}" chưa được hỗ trợ ở bước hiện tại.`, MA_LOI.TEP_DINH_DANG_KHONG_HO_TRO); }
    if ((metadata.soTrang || 1) > 1) { throw taoLoi(422, 'Hình ảnh động hoặc nhiều trang chưa được hỗ trợ ở bước hiện tại.', MA_LOI.CHUYEN_DOI_KHONG_HO_TRO); }
    return metadata;
}

module.exports = {
    DINH_DANG_HINH_ANH,
    batBuocBuffer,
    chuanHoaDinhDangSharp,
    layMimeType,
    chuanHoaMetadata,
    docMetadata,
    batBuocHinhAnhHoTro
};