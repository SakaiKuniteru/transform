'use strict';

const path = require('node:path');
const crypto = require('node:crypto');
const DO_DAI_TEN_TEP_TOI_DA = 255;
const DO_DAI_PHAN_MO_RONG_TOI_DA = 20;

function chuanHoaTenTep(tenTep, fallback = 'tep') {
    let ten = path.basename(String(tenTep || '').replaceAll('\\', '/')).trim();
    ten = ten
        .replace(/[\x00-\x1F\x7F]/g, '')
        .replace(/[<>:"/\\|?*]/g, '_')
        .replace(/\s+/g, ' ')
        .trim();
    if (!ten || ten === '.' || ten === '..') { ten = fallback; }
    if (ten.length <= DO_DAI_TEN_TEP_TOI_DA) { return ten; }
    const extension = layPhanMoRong(ten);
    const doDaiTen = Math.max(1, DO_DAI_TEN_TEP_TOI_DA - extension.length);
    return `${ten.slice(0, doDaiTen)}${extension}`;
}

function layPhanMoRong(tenTep = '') {
    const extension = path.extname(String(tenTep)).toLowerCase();
    if (!extension || extension === '.' || extension.length > DO_DAI_PHAN_MO_RONG_TOI_DA) { return ''; }
    return extension;
}

function layPhanMoRongKhongCham(tenTep = '') { return layPhanMoRong(tenTep).replace(/^\./, ''); }

function layTenKhongPhanMoRong(tenTep = '') {
    const ten = chuanHoaTenTep(tenTep);
    const extension = layPhanMoRong(ten);
    return extension ? ten.slice(0, -extension.length) : ten;
}

function taoTenTepNgauNhien(tenTepGoc = '') {
    return `${crypto.randomUUID()}${layPhanMoRong(tenTepGoc)}`;
}

function tachThongTinTenTep(tenTep = '') {
    const tenTepHopLe = chuanHoaTenTep(tenTep);
    const phanMoRong = layPhanMoRong(tenTepHopLe);
    return {
        tenTep: tenTepHopLe,
        tenKhongPhanMoRong: phanMoRong ? tenTepHopLe.slice(0, -phanMoRong.length) : tenTepHopLe,
        phanMoRong,
        phanMoRongKhongCham: phanMoRong.replace(/^\./, '')
    };
}

function laKichThuocTepHopLe(kichThuoc) {
    return Number.isSafeInteger(kichThuoc) && kichThuoc >= 0;
}

function batBuocKichThuocTep(kichThuoc) {
    if (!laKichThuocTepHopLe(kichThuoc)) { throw new TypeError('Kích thước tệp không hợp lệ.'); }

    return kichThuoc;
}

module.exports = {
    DO_DAI_TEN_TEP_TOI_DA,
    DO_DAI_PHAN_MO_RONG_TOI_DA,
    chuanHoaTenTep,
    layPhanMoRong,
    layPhanMoRongKhongCham,
    layTenKhongPhanMoRong,
    taoTenTepNgauNhien,
    tachThongTinTenTep,
    laKichThuocTepHopLe,
    batBuocKichThuocTep
};