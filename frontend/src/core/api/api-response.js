'use strict';
const { apiResponse } = require('@transform/shared');

function chuanHoaApiResponse(value) {
    if (!apiResponse.laApiResponse(value)) { throw new TypeError('Phản hồi Backend không đúng cấu trúc API chuẩn.'); }
    return value;
}

function laThanhCong(value) { return apiResponse.laThanhCong(value); }

function laThatBai(value) { return apiResponse.laThatBai(value); }

function layDuLieu(value) { return chuanHoaApiResponse(value).data; }

function layMeta(value) { return chuanHoaApiResponse(value).meta; }

function layMessage(value) { return chuanHoaApiResponse(value).message || ''; }

module.exports = { chuanHoaApiResponse, laThanhCong, laThatBai, layDuLieu, layMeta, layMessage };