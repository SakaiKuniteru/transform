'use strict';

const { trangThaiCongViec } = require('@transform/shared');

const DANH_SACH_TRANG_THAI_CONG_VIEC = Object.freeze(Object.values(trangThaiCongViec.TRANG_THAI_CONG_VIEC));

module.exports = {
    ...trangThaiCongViec,
    DANH_SACH_TRANG_THAI_CONG_VIEC
};