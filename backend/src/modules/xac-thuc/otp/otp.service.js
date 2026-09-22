'use strict';

const crypto = require('node:crypto');
const env = require('../../../config/env');
const MA_LOI = require('../../../constants/ma-loi');
const { loiYeuCau, loiQuaNhieuYeuCau } = require('../../../utils/loi');
const { giaoDich } = require('../../../infrastructure/database/transaction');
const repository = require('../xac-thuc.repository');
const { MUC_DICH_OTP, KENH_OTP, TRANG_THAI_OTP } = require('./otp.constant');

function batBuocCauHinh(value, ten) { if (!value) { throw new Error(`Thiếu cấu hình ${ten}.`); } return value; }

function layOtpConfig() { return { secret: batBuocCauHinh(env.otp?.secret, 'OTP_SECRET'), length: Number(env.otp?.length || 6), ttlSeconds: Number(env.otp?.ttlSeconds || 600), maxAttempts: Number(env.otp?.maxAttempts || 5), resendCooldownSeconds: Number(env.otp?.resendCooldownSeconds || 60), maxSendsPerHour: Number(env.otp?.maxSendsPerHour || 5) }; }

function chuanHoaDiaChi(value) { const diaChi = String(value || '').trim().toLowerCase(); if (!diaChi) { throw new TypeError('Địa chỉ nhận OTP không được để trống.'); } return diaChi; }

function kiemTraMucDich(mucDich) { if (!Object.values(MUC_DICH_OTP).includes(mucDich)) { throw new TypeError('Mục đích OTP không hợp lệ.'); } return mucDich; }

function taoOtpSo(length) { let ma = ''; for (let i = 0; i < length; i += 1) { ma += crypto.randomInt(0, 10).toString(); } return ma; }

function bamOtp(diaChi, mucDich, maOtp) { const config = layOtpConfig(); return crypto.createHmac('sha256', config.secret).update(`${mucDich}:${chuanHoaDiaChi(diaChi)}:${maOtp}`).digest('hex'); }

function soSanhHash(hashA, hashB) { if (!hashA || !hashB || hashA.length !== hashB.length) { return false; } return crypto.timingSafeEqual(Buffer.from(hashA, 'utf8'), Buffer.from(hashB, 'utf8')); }

async function tao({ nguoiDung, mucDich, requestId = null } = {}, db) {
    if (!nguoiDung?.id || !nguoiDung?.email) { throw new TypeError('Người dùng tạo OTP không hợp lệ.'); }
    kiemTraMucDich(mucDich);
    const config = layOtpConfig();
    const diaChi = chuanHoaDiaChi(nguoiDung.email);
    const tongGui = await repository.demSoLanGuiOtpTrongGio({ nguoiDungId: nguoiDung.id, diaChi, mucDich }, db);
    if (tongGui >= config.maxSendsPerHour) { throw loiQuaNhieuYeuCau('Bạn đã yêu cầu gửi mã xác thực quá nhiều lần.', MA_LOI.OTP_VUOT_SO_LAN_GUI); }
    const otpMoiNhat = await repository.layOtpMoiNhat({ nguoiDungId: nguoiDung.id, diaChi, mucDich }, db);
    if (otpMoiNhat?.guiLanCuoiLuc) {
        const daQua = Math.floor((Date.now() - new Date(otpMoiNhat.guiLanCuoiLuc).getTime()) / 1000);
        if (daQua < config.resendCooldownSeconds) { throw loiQuaNhieuYeuCau('Vui lòng chờ trước khi yêu cầu gửi lại mã xác thực.', MA_LOI.OTP_GUI_QUA_NHANH, null, { thuLaiSauGiay: config.resendCooldownSeconds - daQua }); }
    }
    const maOtp = taoOtpSo(config.length);
    const maHash = bamOtp(diaChi, mucDich, maOtp);
    const hetHanLuc = new Date(Date.now() + config.ttlSeconds * 1000);
    const otp = otpMoiNhat?.trangThai === TRANG_THAI_OTP.CHO_XAC_THUC ? await repository.guiLaiOtp(otpMoiNhat.id, { maHash, soLanThuToiDa: config.maxAttempts, hetHanLuc, requestId }, db) : await repository.taoOtp({ nguoiDungId: nguoiDung.id, kenh: KENH_OTP.EMAIL, diaChi, mucDich, maHash, soLanThuToiDa: config.maxAttempts, hetHanLuc, requestId }, db);
    const ketQua = { otpId: otp.id, hetHanLuc: otp.hetHanLuc, ttlSeconds: config.ttlSeconds, maOtpDevelopment: env.laDevelopment ? maOtp : null };
    Object.defineProperty(ketQua, 'maOtp', { value: maOtp, enumerable: false, configurable: false, writable: false });
    return ketQua;
}

async function xacThuc({ nguoiDung, mucDich, maOtp, khiHopLe = null } = {}) {
    if (!nguoiDung?.id || !nguoiDung?.email) { throw new TypeError('Người dùng xác thực OTP không hợp lệ.'); }
    kiemTraMucDich(mucDich);
    if (khiHopLe !== null && typeof khiHopLe !== 'function') { throw new TypeError('khiHopLe phải là function hoặc null.'); }
    const diaChi = chuanHoaDiaChi(nguoiDung.email);
    const ketQua = await giaoDich(async (db) => {
        const otp = await repository.layOtpMoiNhat({ nguoiDungId: nguoiDung.id, diaChi, mucDich }, db);
        if (!otp) { return { thanhCong: false, error: loiYeuCau('Không tìm thấy mã xác thực.', MA_LOI.OTP_KHONG_TIM_THAY) }; }
        if (otp.trangThai === TRANG_THAI_OTP.DA_XAC_THUC) { return { thanhCong: false, error: loiYeuCau('Mã xác thực đã được sử dụng.', MA_LOI.OTP_DA_SU_DUNG) }; }
        if (otp.trangThai === TRANG_THAI_OTP.VO_HIEU_HOA) { return { thanhCong: false, error: loiYeuCau('Mã xác thực đã bị vô hiệu hóa.', MA_LOI.OTP_DA_VO_HIEU_HOA) }; }
        if (otp.trangThai === TRANG_THAI_OTP.VUOT_SO_LAN_THU) { return { thanhCong: false, error: loiYeuCau('Mã xác thực đã vượt quá số lần thử cho phép.', MA_LOI.OTP_VUOT_SO_LAN_THU) }; }
        if (otp.trangThai === TRANG_THAI_OTP.HET_HAN || new Date(otp.hetHanLuc).getTime() <= Date.now()) {
            await repository.danhDauOtpHetHan(otp.id, db);
            return { thanhCong: false, error: loiYeuCau('Mã xác thực đã hết hạn.', MA_LOI.OTP_HET_HAN) };
        }
        const maHash = bamOtp(diaChi, mucDich, maOtp);
        if (!soSanhHash(maHash, otp.maHash)) {
            const capNhat = await repository.tangLanThuOtp(otp.id, db);
            if (capNhat.trangThai === TRANG_THAI_OTP.VUOT_SO_LAN_THU) { return { thanhCong: false, error: loiYeuCau('Mã xác thực đã vượt quá số lần thử cho phép.', MA_LOI.OTP_VUOT_SO_LAN_THU) }; }
            return { thanhCong: false, error: loiYeuCau('Mã xác thực không đúng.', MA_LOI.OTP_KHONG_HOP_LE) };
        }
        await repository.danhDauOtpDaXacThuc(otp.id, db);
        const giaTri = khiHopLe ? await khiHopLe(otp, db) : otp;
        return { thanhCong: true, giaTri };
    });
    if (!ketQua.thanhCong) { throw ketQua.error; }
    return ketQua.giaTri;
}

module.exports = {
    layOtpConfig,
    chuanHoaDiaChi,
    taoOtpSo,
    bamOtp,
    soSanhHash,
    tao,
    xacThuc
};