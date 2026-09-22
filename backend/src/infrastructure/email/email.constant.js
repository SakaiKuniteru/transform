'use strict';

const PROVIDER_EMAIL = Object.freeze({
    SMTP: 'smtp'
});

const LOAI_EMAIL = Object.freeze({
    XAC_THUC_EMAIL: 'XAC_THUC_EMAIL',
    DAT_LAI_MAT_KHAU: 'DAT_LAI_MAT_KHAU'
});

const TEN_JOB_EMAIL = Object.freeze({
    GUI_EMAIL: 'gui-email'
});

const DO_UU_TIEN_EMAIL = Object.freeze({
    CAO: 1,
    BINH_THUONG: 5,
    THAP: 10
});

module.exports = {
    PROVIDER_EMAIL,
    LOAI_EMAIL,
    TEN_JOB_EMAIL,
    DO_UU_TIEN_EMAIL
};