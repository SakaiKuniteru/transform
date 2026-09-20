'use strict';

const NGUON_TAO_TEP = Object.freeze({
    UPLOAD: 'UPLOAD',
    CONG_VIEC: 'CONG_VIEC',
    HE_THONG: 'HE_THONG'
});

const TRANG_THAI_TEP = Object.freeze({
    HOAT_DONG: 'HOAT_DONG',
    HET_HAN: 'HET_HAN',
    DA_XOA: 'DA_XOA'
});

const LOAI_PHIEN_BAN_TEP = Object.freeze({
    GOC: 'GOC',
    KET_QUA: 'KET_QUA',
    TAM: 'TAM'
});

const TRANG_THAI_PHIEN_BAN_TEP = Object.freeze({
    DANG_TAO: 'DANG_TAO',
    SAN_SANG: 'SAN_SANG',
    LOI: 'LOI',
    DA_XOA: 'DA_XOA'
});

const DANH_SACH_NGUON_TAO_TEP = Object.freeze(Object.values(NGUON_TAO_TEP));
const DANH_SACH_TRANG_THAI_TEP = Object.freeze(Object.values(TRANG_THAI_TEP));
const DANH_SACH_LOAI_PHIEN_BAN_TEP = Object.freeze(Object.values(LOAI_PHIEN_BAN_TEP));
const DANH_SACH_TRANG_THAI_PHIEN_BAN_TEP = Object.freeze(Object.values(TRANG_THAI_PHIEN_BAN_TEP));

module.exports = {
    NGUON_TAO_TEP,
    TRANG_THAI_TEP,
    LOAI_PHIEN_BAN_TEP,
    TRANG_THAI_PHIEN_BAN_TEP,
    DANH_SACH_NGUON_TAO_TEP,
    DANH_SACH_TRANG_THAI_TEP,
    DANH_SACH_LOAI_PHIEN_BAN_TEP,
    DANH_SACH_TRANG_THAI_PHIEN_BAN_TEP
};