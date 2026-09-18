'use strict';

const dinhDangTep = require('./constants/dinh-dang-tep');
const loaiChuyenDoi = require('./constants/loai-chuyen-doi');
const trangThaiCongViec = require('./constants/trang-thai-cong-viec');
const apiResponse = require('./schemas/api-response');
const congViecSchema = require('./schemas/cong-viec');

module.exports = {
    dinhDangTep,
    loaiChuyenDoi,
    trangThaiCongViec,
    apiResponse,
    congViecSchema
};