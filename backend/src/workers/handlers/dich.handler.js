'use strict';

const { TEN_QUEUE } = require('../../config/queue');
const { TRANG_THAI_CONG_VIEC } = require('../../constants/trang-thai-cong-viec');
const { taoHandler } = require('./chuyen-doi.handler');

const xuLy = taoHandler({ tenQueue: TEN_QUEUE.DICH, loaiXuLy: 'DICH', trangThaiCongViec: TRANG_THAI_CONG_VIEC.DANG_DICH });

module.exports = { xuLy };