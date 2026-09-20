'use strict';

const hanMucService = require('../modules/han-muc/han-muc.service');
const { taoLoiVuotHanMuc } = require('../modules/han-muc/han-muc.util');
const { MA_HAN_MUC } = require('../constants/han-muc');

function taoLoi(statusCode, message, code = 'LOI_CHINH_SACH_UPLOAD') {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    return error;
}

function parseId(value, ten) {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) { throw taoLoi(400, `${ten} không hợp lệ.`, 'ID_KHONG_HOP_LE'); }
    return id;
}

function layChuThe(req) {
    if (req.user?.id) {
        return {
            nguoiDungId: parseId(req.user.id, 'ID người dùng')
        };
    }
    const phienKhachId = req.phienKhachId ?? req.phienKhach?.id;
    if (phienKhachId) {
        return {
            phienKhachId: parseId(phienKhachId, 'ID phiên khách')
        };
    }
    throw taoLoi(401, 'Không xác định được người dùng hoặc phiên khách.', 'KHONG_XAC_DINH_DUOC_CHU_THE_UPLOAD');
}

function layGioiHanHuuHan(tinhTrang, ten) {
    if (tinhTrang.chinhSach.khongGioiHan) { return null; }
    const value = Number(tinhTrang.gioiHan);
    if (!Number.isSafeInteger(value) || value <= 0) { throw taoLoi(500, `${ten} chưa được cấu hình hợp lệ.`, 'CHINH_SACH_UPLOAD_KHONG_HOP_LE'); }
    return value;
}

function mapTongSoTep(tinhTrang) {
    return {
        chinhSachId: tinhTrang.chinhSach.id,
        maHanhDong: tinhTrang.chinhSach.maHanhDong,
        donVi: tinhTrang.chinhSach.donVi,
        chuKy: tinhTrang.chinhSach.chuKy,
        khongGioiHan: tinhTrang.chinhSach.khongGioiHan,
        gioiHan: tinhTrang.gioiHan,
        daSuDung: tinhTrang.daSuDung,
        conLai: tinhTrang.conLai,
        kyBatDau: tinhTrang.ky?.kyBatDau || null,
        kyKetThuc: tinhTrang.ky?.kyKetThuc || null
    };
}

async function chinhSachUpload(req, res, next) {
    try {
        const chuThe = layChuThe(req);
        const thoiDiem = new Date();
        const [tongSoTep, soTepMoiLan, kichThuocMoiTep] = await Promise.all([
            hanMucService.layTinhTrang({
                ...chuThe,
                maHanhDong: MA_HAN_MUC.UPLOAD_TONG_SO_TEP,
                thoiDiem
            }),
            hanMucService.layTinhTrang({
                ...chuThe,
                maHanhDong: MA_HAN_MUC.UPLOAD_SO_TEP_MOI_LAN,
                thoiDiem
            }),
            hanMucService.layTinhTrang({
                ...chuThe,
                maHanhDong: MA_HAN_MUC.UPLOAD_KICH_THUOC_MOI_TEP,
                thoiDiem
            })
        ]);
        if (!tongSoTep.chinhSach.khongGioiHan && tongSoTep.ky?.theoDoi && !tongSoTep.duocPhep) {
            throw taoLoiVuotHanMuc(tongSoTep.chinhSach, {
                maHanhDong: tongSoTep.chinhSach.maHanhDong,
                gioiHan: tongSoTep.gioiHan,
                daSuDung: tongSoTep.daSuDung,
                conLai: tongSoTep.conLai,
                soLuongYeuCau: 1
            });
        }
        req.uploadPolicy = Object.freeze({
            daResolve: true,
            chuThe: Object.freeze({ ...chuThe }),
            thoiDiem,
            tongSoTep: Object.freeze(mapTongSoTep(tongSoTep)),
            khongGioiHanTongSoTep: tongSoTep.chinhSach.khongGioiHan,
            soTepToiDaMoiLan: layGioiHanHuuHan(soTepMoiLan, 'Số tệp tối đa mỗi lần upload'),
            khongGioiHanSoTepMoiLan: soTepMoiLan.chinhSach.khongGioiHan,
            kichThuocToiDaMoiTepBytes: layGioiHanHuuHan(kichThuocMoiTep, 'Kích thước tối đa mỗi tệp'),
            khongGioiHanKichThuocMoiTep: kichThuocMoiTep.chinhSach.khongGioiHan,
            dangKyGoiId: tongSoTep.chuThe?.dangKyGoi?.id || null
        });
        return next();
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    chinhSachUpload,
    layChuThe
};