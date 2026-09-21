'use strict';

const { TEN_QUEUE } = require('../../config/queue');
const { TRANG_THAI_CONG_VIEC } = require('../../constants/trang-thai-cong-viec');
const { taoHandler } = require('./chuyen-doi.handler');

const xuLy = taoHandler({ tenQueue: TEN_QUEUE.TAI_LIEU, loaiXuLy: 'TAI_LIEU', trangThaiCongViec: TRANG_THAI_CONG_VIEC.DANG_CHUYEN_DOI });

module.exports = { xuLy };