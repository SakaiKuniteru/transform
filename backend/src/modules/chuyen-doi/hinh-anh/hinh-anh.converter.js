'use strict';

const { LOAI_CHUYEN_DOI } = require('../../../constants/loai-chuyen-doi');
const transformEngine = require('../engine/transform-engine.service');

const converter = transformEngine.dangKyConverter({
    key: 'sharp:png-webp',
    ten: 'PNG sang WebP bằng Sharp',
    loaiChuyenDoi: LOAI_CHUYEN_DOI.CHUYEN_DINH_DANG,
    nhomXuLy: 'HINH_ANH',
    dinhDangNguon: 'png',
    dinhDangDich: 'webp',
    uuTien: 100,
    chiPhi: 1,
    engine: 'sharp',
    phienBanEngine: '0.35',
    async xuLy(context) {
        await context.kiemTraHuy();
        await context.capNhatTienTrinh(10);
        const dauRa = {};
        await context.capNhatTienTrinh(90);
        return {
            dauRa,
            congCu: 'sharp',
            phienBanCongCu: '0.35'
        };
    }
});

module.exports = converter;