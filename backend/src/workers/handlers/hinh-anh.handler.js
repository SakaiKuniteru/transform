'use strict';

require('../../modules/chuyen-doi/hinh-anh/hinh-anh.converter');
const { TEN_QUEUE } = require('../../config/queue');
const { TRANG_THAI_CONG_VIEC } = require('../../constants/trang-thai-cong-viec');
const { taoHandler } = require('./chuyen-doi.handler');

const xuLy = taoHandler({ tenQueue: TEN_QUEUE.HINH_ANH, loaiXuLy: 'HINH_ANH', trangThaiCongViec: TRANG_THAI_CONG_VIEC.DANG_CHUYEN_DOI });

module.exports = { xuLy };