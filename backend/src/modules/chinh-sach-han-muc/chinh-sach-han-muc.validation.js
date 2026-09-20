'use strict';

const Joi = require('joi');

const {
    DOI_TUONG_HAN_MUC,
    DON_VI_HAN_MUC,
    CHU_KY_HAN_MUC,
    HANH_DONG_KHI_VUOT,
    MA_HAN_MUC,
    DANH_SACH_DOI_TUONG_HAN_MUC,
    DANH_SACH_DON_VI_HAN_MUC,
    DANH_SACH_CHU_KY_HAN_MUC,
    DANH_SACH_HANH_DONG_KHI_VUOT,
    DANH_SACH_MA_HAN_MUC
} = require('../../constants/han-muc');

const idSchema = Joi.number().integer().positive().required();
const maSchema = Joi.string().trim().uppercase().max(100).pattern(/^[A-Z0-9_-]+$/).required();
const tenSchema = Joi.string().trim().min(1).max(255).required();
const doiTuongSchema = Joi.string().valid(...DANH_SACH_DOI_TUONG_HAN_MUC).required();
const loaiTaiKhoanSchema = Joi.string().trim().uppercase().max(30).allow(null);
const goiDichVuIdSchema = Joi.number().integer().positive().allow(null);
const maHanhDongSchema = Joi.string().trim().uppercase().valid(...DANH_SACH_MA_HAN_MUC).required();
const donViSchema = Joi.string().valid(...DANH_SACH_DON_VI_HAN_MUC).required();
const chuKySchema = Joi.string().valid(...DANH_SACH_CHU_KY_HAN_MUC).required();
const muiGioSchema = Joi.string().trim().min(1).max(64).default('UTC');
const gioiHanSchema = Joi.number().integer().min(0).allow(null);
const hanhDongKhiVuotSchema = Joi.string().valid(...DANH_SACH_HANH_DONG_KHI_VUOT).required();
const mucDoUuTienSchema = Joi.number().integer().min(1).default(100);
const thoiGianSchema = Joi.date().iso();
const metadataSchema = Joi.object().unknown(true);

function kiemTraQuanHe(value, helpers) {
    if (value.doiTuong === DOI_TUONG_HAN_MUC.KHACH || value.doiTuong === DOI_TUONG_HAN_MUC.NGUOI_DUNG) {
        if (value.loaiTaiKhoan !== null || value.goiDichVuId !== null) { return helpers.message({ custom: 'Đối tượng KHACH hoặc NGUOI_DUNG không được khai báo loại tài khoản hoặc gói dịch vụ.' }); }
    }
    if (value.doiTuong === DOI_TUONG_HAN_MUC.LOAI_TAI_KHOAN) {
        if (!value.loaiTaiKhoan || value.goiDichVuId !== null) { return helpers.message({ custom: 'Đối tượng LOAI_TAI_KHOAN phải có loaiTaiKhoan và không được có goiDichVuId.' }); }
    }
    if (value.doiTuong === DOI_TUONG_HAN_MUC.GOI_DICH_VU) {
        if (!value.goiDichVuId || value.loaiTaiKhoan !== null) { return helpers.message({ custom: 'Đối tượng GOI_DICH_VU phải có goiDichVuId và không được có loaiTaiKhoan.' }); }
    }
    if (value.khongGioiHan === true && value.gioiHan !== null) { return helpers.message({ custom: 'Chính sách không giới hạn phải có gioiHan bằng null.' }); }
    if (value.khongGioiHan === false && value.gioiHan === null) { return helpers.message({ custom: 'Chính sách có giới hạn phải khai báo gioiHan.' }); }
    if (value.maHanhDong === MA_HAN_MUC.UPLOAD_TONG_SO_TEP && (value.donVi !== DON_VI_HAN_MUC.TEP || value.chuKy !== CHU_KY_HAN_MUC.THEO_GOI)) { return helpers.message({ custom: 'UPLOAD_TONG_SO_TEP phải dùng donVi=TEP và chuKy=THEO_GOI.' }); }
    if (value.maHanhDong === MA_HAN_MUC.UPLOAD_SO_TEP_MOI_LAN && (value.donVi !== DON_VI_HAN_MUC.TEP || value.chuKy !== CHU_KY_HAN_MUC.MOI_REQUEST || value.khongGioiHan === true)) { return helpers.message({ custom: 'UPLOAD_SO_TEP_MOI_LAN phải dùng donVi=TEP, chuKy=MOI_REQUEST và phải có giới hạn hữu hạn.' }); }
    if (value.maHanhDong === MA_HAN_MUC.UPLOAD_KICH_THUOC_MOI_TEP && (value.donVi !== DON_VI_HAN_MUC.BYTE || value.chuKy !== CHU_KY_HAN_MUC.MOI_TEP || value.khongGioiHan === true)) { return helpers.message({ custom: 'UPLOAD_KICH_THUOC_MOI_TEP phải dùng donVi=BYTE, chuKy=MOI_TEP và phải có giới hạn hữu hạn.' }); }
    if (value.hieuLucTu && value.hieuLucDen && new Date(value.hieuLucTu) >= new Date(value.hieuLucDen)) { return helpers.message({ custom: 'hieuLucTu phải nhỏ hơn hieuLucDen.' }); }
    return value;
}

const taoMoiSchema = Joi.object({
    ma: maSchema,
    ten: tenSchema,
    doiTuong: doiTuongSchema,
    loaiTaiKhoan: loaiTaiKhoanSchema.default(null),
    goiDichVuId: goiDichVuIdSchema.default(null),
    maHanhDong: maHanhDongSchema,
    donVi: donViSchema,
    chuKy: chuKySchema,
    muiGio: muiGioSchema,
    gioiHan: gioiHanSchema.default(null),
    khongGioiHan: Joi.boolean().default(false),
    hanhDongKhiVuot: hanhDongKhiVuotSchema.default(HANH_DONG_KHI_VUOT.TU_CHOI),
    mucDoUuTien: mucDoUuTienSchema,
    hieuLucTu: thoiGianSchema.default(() => new Date()),
    hieuLucDen: thoiGianSchema.allow(null).default(null),
    active: Joi.boolean().default(true),
    metadata: metadataSchema.default({})
}).custom(kiemTraQuanHe);

const capNhatSchema = Joi.object({
    ma: maSchema.optional(),
    ten: tenSchema.optional(),
    doiTuong: doiTuongSchema.optional(),
    loaiTaiKhoan: loaiTaiKhoanSchema.optional(),
    goiDichVuId: goiDichVuIdSchema.optional(),
    maHanhDong: maHanhDongSchema.optional(),
    donVi: donViSchema.optional(),
    chuKy: chuKySchema.optional(),
    muiGio: muiGioSchema.optional(),
    gioiHan: gioiHanSchema.optional(),
    khongGioiHan: Joi.boolean().optional(),
    hanhDongKhiVuot: hanhDongKhiVuotSchema.optional(),
    mucDoUuTien: mucDoUuTienSchema.optional(),
    hieuLucTu: thoiGianSchema.optional(),
    hieuLucDen: thoiGianSchema.allow(null).optional(),
    active: Joi.boolean().optional(),
    metadata: metadataSchema.optional()
}).min(1);

const capNhatTrangThaiSchema = Joi.object({
    active: Joi.boolean().required()
});

const paramsIdSchema = Joi.object({
    id: idSchema
});

const danhSachSchema = Joi.object({
    tuKhoa: Joi.string().trim().max(255).allow(''),
    doiTuong: Joi.string().valid(...DANH_SACH_DOI_TUONG_HAN_MUC),
    loaiTaiKhoan: Joi.string().trim().uppercase().max(30),
    goiDichVuId: Joi.number().integer().positive(),
    maHanhDong: Joi.string().trim().uppercase().valid(...DANH_SACH_MA_HAN_MUC),
    donVi: Joi.string().valid(...DANH_SACH_DON_VI_HAN_MUC),
    chuKy: Joi.string().valid(...DANH_SACH_CHU_KY_HAN_MUC),
    active: Joi.boolean(),
    dangHieuLuc: Joi.boolean(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('id', 'ma', 'ten', 'mucDoUuTien', 'hieuLucTu', 'createdAt').default('mucDoUuTien'),
    sortOrder: Joi.string().valid('asc', 'desc').lowercase().default('asc')
});

module.exports = {
    taoMoiSchema,
    capNhatSchema,
    capNhatTrangThaiSchema,
    paramsIdSchema,
    danhSachSchema,
    kiemTraQuanHe
};