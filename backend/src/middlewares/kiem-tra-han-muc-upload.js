'use strict';

const hanMucService = require('../modules/han-muc/han-muc.service');
const { MA_HAN_MUC } = require('../constants/han-muc');
const {
    layDanhSachTep,
    xoaTepTamTrongRequest
} = require('./upload');

function taoLoi(statusCode, message, code = 'LOI_HAN_MUC_UPLOAD') {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    return error;
}

function layUploadPolicy(req) {
    if (!req.uploadPolicy?.daResolve) { throw taoLoi(500, 'Chính sách upload chưa được resolve.', 'UPLOAD_POLICY_CHUA_RESOLVE'); }
    if (!req.uploadPolicy.chuThe) { throw taoLoi(500, 'Không xác định được chủ thể của chính sách upload.', 'UPLOAD_POLICY_THIEU_CHU_THE'); }
    return req.uploadPolicy;
}

function kiemTraTepDaNhan(policy, danhSachTep) {
    if (!Array.isArray(danhSachTep) || danhSachTep.length === 0) { throw taoLoi(400, 'Không có tệp nào được tải lên.', 'UPLOAD_KHONG_CO_TEP'); }
    if (!policy.khongGioiHanSoTepMoiLan && danhSachTep.length > policy.soTepToiDaMoiLan) {
        throw taoLoi(413, `Mỗi lần chỉ được tải tối đa ${policy.soTepToiDaMoiLan} tệp.`, 'UPLOAD_VUOT_SO_TEP_MOI_LAN');
    }
    if (!policy.khongGioiHanKichThuocMoiTep) {
        const tepVuot = danhSachTep.find((file) => Number(file.size) > policy.kichThuocToiDaMoiTepBytes);
        if (tepVuot) { throw taoLoi(413, `Tệp "${tepVuot.originalname}" vượt quá kích thước cho phép.`, 'UPLOAD_VUOT_KICH_THUOC_TEP'); }
    }
}

async function kiemTraHanMucUpload(req, res, next) {
    try {
        const policy = layUploadPolicy(req);
        const danhSachTep = layDanhSachTep(req);
        kiemTraTepDaNhan(policy, danhSachTep);
        const phieuGiu = await hanMucService.giuHanMuc({
            ...policy.chuThe,
            maHanhDong: MA_HAN_MUC.UPLOAD_TONG_SO_TEP,
            soLuong: danhSachTep.length,
            thoiDiem: policy.thoiDiem
        });
        req.uploadHanMuc = phieuGiu;
        req.uploadHanMucDaHoanTra = false;
        return next();
    } catch (error) {
        await xoaTepTamTrongRequest(req);
        return next(error);
    }
}

async function hoanTraHanMucUpload(req) {
    if (!req?.uploadHanMuc || req.uploadHanMucDaHoanTra) { return null; }
    req.uploadHanMucDaHoanTra = true;
    try {
        const ketQua = await hanMucService.hoanTraHanMuc(req.uploadHanMuc);
        req.uploadHanMuc = null;
        return ketQua;
    } catch (error) {
        req.uploadHanMucDaHoanTra = false;
        throw error;
    }
}

module.exports = {
    kiemTraHanMucUpload,
    hoanTraHanMucUpload
};