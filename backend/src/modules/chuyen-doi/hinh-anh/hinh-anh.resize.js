'use strict';

const sharp = require('sharp');
const MA_LOI = require('../../../constants/ma-loi');
const { taoLoiTheoStatus: taoLoi } = require('../../../utils/loi');

const FIT_HOP_LE = new Set(['cover', 'contain', 'fill', 'inside', 'outside']);
const POSITION_HOP_LE = new Set(['centre', 'center', 'north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'entropy', 'attention']);
const KERNEL_HOP_LE = new Set(['nearest', 'cubic', 'mitchell', 'lanczos2', 'lanczos3']);

function soNguyenDuong(value, ten, batBuoc = false) {
    if (value === undefined || value === null || value === '') {
        if (batBuoc) { throw taoLoi(400, `${ten} là bắt buộc.`, MA_LOI.CHUYEN_DOI_KHONG_HO_TRO); }
        return null;
    }
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number <= 0) { throw taoLoi(400, `${ten} phải là số nguyên dương.`, MA_LOI.CHUYEN_DOI_KHONG_HO_TRO); }
    return number;
}

function soNguyenKhongAm(value, ten) {
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 0) { throw taoLoi(400, `${ten} phải là số nguyên không âm.`, MA_LOI.CHUYEN_DOI_KHONG_HO_TRO); }
    return number;
}

function chuanHoaFit(value) {
    const fit = String(value || 'cover').trim().toLowerCase();
    if (!FIT_HOP_LE.has(fit)) { throw taoLoi(400, `Chế độ resize "${fit}" không hợp lệ.`, MA_LOI.CHUYEN_DOI_KHONG_HO_TRO); }
    return fit;
}

function chuanHoaPosition(value) {
    if (value === undefined || value === null || value === '') { return 'centre'; }
    const position = String(value).trim().toLowerCase();
    if (!POSITION_HOP_LE.has(position)) { throw taoLoi(400, `Vị trí resize "${position}" không hợp lệ.`, MA_LOI.CHUYEN_DOI_KHONG_HO_TRO); }
    return position === 'center' ? 'centre' : position;
}

function chuanHoaKernel(value) {
    if (value === undefined || value === null || value === '') { return sharp.kernel.lanczos3; }
    const kernel = String(value).trim().toLowerCase();
    if (!KERNEL_HOP_LE.has(kernel)) { throw taoLoi(400, `Kernel resize "${kernel}" không hợp lệ.`, MA_LOI.CHUYEN_DOI_KHONG_HO_TRO); }
    return sharp.kernel[kernel];
}

function apDungResize(pipeline, options = {}) {
    const chieuRong = soNguyenDuong(options.chieuRong ?? options.width, 'Chiều rộng');
    const chieuCao = soNguyenDuong(options.chieuCao ?? options.height, 'Chiều cao');
    if (!chieuRong && !chieuCao) { throw taoLoi(400, 'Đổi kích thước yêu cầu chiều rộng hoặc chiều cao.', MA_LOI.CHUYEN_DOI_KHONG_HO_TRO); }
    return pipeline.resize(chieuRong, chieuCao, {
        fit: chuanHoaFit(options.cheDo ?? options.fit),
        position: chuanHoaPosition(options.viTri ?? options.position),
        background: options.mauNen ?? options.background,
        kernel: chuanHoaKernel(options.kernel),
        withoutEnlargement: options.khongPhongTo === true || options.withoutEnlargement === true,
        withoutReduction: options.khongThuNho === true || options.withoutReduction === true,
        fastShrinkOnLoad: options.fastShrinkOnLoad !== false
    });
}

function apDungCat(pipeline, options = {}, metadata = {}) {
    const left = soNguyenKhongAm(options.x ?? options.left, 'Tọa độ x');
    const top = soNguyenKhongAm(options.y ?? options.top, 'Tọa độ y');
    const width = soNguyenDuong(options.chieuRong ?? options.width, 'Chiều rộng vùng cắt', true);
    const height = soNguyenDuong(options.chieuCao ?? options.height, 'Chiều cao vùng cắt', true);
    if (metadata.chieuRong && left + width > metadata.chieuRong) { throw taoLoi(400, 'Vùng cắt vượt quá chiều rộng hình ảnh.', MA_LOI.CHUYEN_DOI_KHONG_HO_TRO); }
    if (metadata.chieuCao && top + height > metadata.chieuCao) { throw taoLoi(400, 'Vùng cắt vượt quá chiều cao hình ảnh.', MA_LOI.CHUYEN_DOI_KHONG_HO_TRO); }
    return pipeline.extract({ left, top, width, height });
}

function apDungXoay(pipeline, options = {}) {
    const value = options.goc ?? options.angle;
    if (value === undefined || value === null || value === '') { throw taoLoi(400, 'Xoay hình ảnh yêu cầu góc xoay.', MA_LOI.CHUYEN_DOI_KHONG_HO_TRO); }
    const angle = Number(value);
    if (!Number.isFinite(angle)) { throw taoLoi(400, 'Góc xoay hình ảnh không hợp lệ.', MA_LOI.CHUYEN_DOI_KHONG_HO_TRO); }
    return pipeline.rotate(angle, {
        background: options.mauNen ?? options.background
    });
}

module.exports = {
    apDungResize,
    apDungCat,
    apDungXoay
};