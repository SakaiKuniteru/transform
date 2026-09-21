'use strict';

const hanMucService = require('../modules/han-muc/han-muc.service');
const { MA_HAN_MUC } = require('../constants/han-muc');
const MA_LOI = require('../constants/ma-loi');
const { taoLoiTheoStatus: taoLoi } = require('../utils/loi');
const {
    layDanhSachTep,
    xoaTepTamTrongRequest
} = require('./upload');

function layUploadPolicy(req) {
    if (!req.uploadPolicy?.daResolve) { throw taoLoi(500, 'Chính sách upload chưa được resolve.', MA_LOI.UPLOAD_POLICY_CHUA_RESOLVE); }
    if (!req.uploadPolicy.chuThe) { throw taoLoi(500, 'Không xác định được chủ thể của chính sách upload.', MA_LOI.UPLOAD_POLICY_THIEU_CHU_THE); }
    return req.uploadPolicy;
}

function kiemTraTepDaNhan(policy, danhSachTep) {
    if (!Array.isArray(danhSachTep) || danhSachTep.length === 0) { throw taoLoi(400, 'Không có tệp nào được tải lên.', MA_LOI.UPLOAD_KHONG_CO_TEP); }
    if (!policy.khongGioiHanSoTepMoiLan && danhSachTep.length > policy.soTepToiDaMoiLan) {
        throw taoLoi(413, `Mỗi lần chỉ được tải tối đa ${policy.soTepToiDaMoiLan} tệp.`, MA_LOI.UPLOAD_VUOT_SO_TEP_MOI_LAN);
    }
    if (!policy.khongGioiHanKichThuocMoiTep) {
        const tepVuot = danhSachTep.find((file) => Number(file.size) > policy.kichThuocToiDaMoiTepBytes);
        if (tepVuot) { throw taoLoi(413, `Tệp "${tepVuot.originalname}" vượt quá kích thước cho phép.`, MA_LOI.UPLOAD_VUOT_KICH_THUOC_TEP); }
    }
}

async function kiemTraHanMucUpload(req, res, next) {
    try {
        const policy = layUploadPolicy(req);
        const danhSachTep = layDanhSachTep(req);
        kiemTraTepDaNhan(policy, danhSachTep);
        const phieuGiu = await hanMucService.giuNhieuHanMuc([
            {
                ...policy.chuThe,
                maHanhDong: MA_HAN_MUC.UPLOAD_TONG_SO_LAN,
                soLuong: 1,
                thoiDiem: policy.thoiDiem
            },
            {
                ...policy.chuThe,
                maHanhDong: MA_HAN_MUC.UPLOAD_TONG_SO_TEP,
                soLuong: danhSachTep.length,
                thoiDiem: policy.thoiDiem
            }
        ]);
        req.uploadHanMuc = phieuGiu;
        req.uploadHanMucDaHoanTra = false;
        return next();
    } catch (error) {
        await xoaTepTamTrongRequest(req);
        return next(error);
    }
}

async function hoanTraHanMucUpload(req) {
    if (!Array.isArray(req?.uploadHanMuc) || req.uploadHanMuc.length === 0 || req.uploadHanMucDaHoanTra) { return null; }
    req.uploadHanMucDaHoanTra = true;
    try {
        const ketQua = await hanMucService.hoanTraNhieuHanMuc(req.uploadHanMuc);
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