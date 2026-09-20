'use strict';

const repository = require('./dang-ky-goi.repository');
const { giaoDich } = require('../../infrastructure/database/transaction');

function taoLoi(statusCode, message, code = 'LOI_NGHIEP_VU') {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    return error;
}

function parseId(value, ten = 'ID') {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) { throw taoLoi(400, `${ten} không hợp lệ.`, 'ID_KHONG_HOP_LE'); }
    return id;
}

function kiemTraBatDauLuc(value) {
    if (!value) { return null; }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) { throw taoLoi(400, 'Thời gian bắt đầu không hợp lệ.', 'THOI_GIAN_KHONG_HOP_LE'); }
    if (date.getTime() > Date.now()) { throw taoLoi(400, 'Thời gian bắt đầu không được lớn hơn thời gian hiện tại.', 'THOI_GIAN_BAT_DAU_TUONG_LAI'); }
    return date;
}

async function layGoiHopLe(goiDichVuId, db = null) {
    const goi = await repository.getGoiDichVuById(goiDichVuId, db);
    if (!goi) { throw taoLoi(404, 'Gói dịch vụ không tồn tại.', 'GOI_DICH_VU_KHONG_TON_TAI'); }
    if (!goi.active) { throw taoLoi(400, 'Gói dịch vụ hiện không còn được phép đăng ký.', 'GOI_DICH_VU_KHONG_HOAT_DONG'); }
    return goi;
}

async function getDanhSach(query = {}) {
    await repository.dongBoHetHan();
    return repository.getDanhSach(query);
}

async function getChiTiet(id) {
    const dangKyId = parseId(id, 'ID đăng ký gói');
    const dangKy = await repository.getById(dangKyId);
    if (!dangKy) { throw taoLoi(404, 'Đăng ký gói không tồn tại.', 'DANG_KY_GOI_KHONG_TON_TAI'); }
    return dangKy;
}

async function getCuaToi(nguoiDungId, query = {}) {
    const userId = parseId(nguoiDungId, 'ID người dùng');
    await repository.dongBoHetHan(userId);
    return repository.getCuaNguoiDung(userId, query);
}

async function getHienTai(nguoiDungId) {
    const userId = parseId(nguoiDungId, 'ID người dùng');
    await repository.dongBoHetHan(userId);
    return repository.getHienTaiCuaNguoiDung(userId);
}

async function dangKy(nguoiDungId, data) {
    const userId = parseId(nguoiDungId, 'ID người dùng');
    const goiId = parseId(data.goiDichVuId, 'ID gói dịch vụ');
    return giaoDich(async (db) => {
        const nguoiDung = await repository.khoaNguoiDung(userId, db);
        if (!nguoiDung) { throw taoLoi(404, 'Người dùng không tồn tại.', 'NGUOI_DUNG_KHONG_TON_TAI'); }
        await repository.dongBoHetHan(userId, db);
        const goi = await layGoiHopLe(goiId, db);
        const dangMo = await repository.getDangMoCuaNguoiDungVaGoi(userId, goiId, db);
        if (dangMo) { throw taoLoi(409, 'Bạn đã có đăng ký chưa kết thúc đối với gói dịch vụ này.', 'DANG_KY_GOI_DA_TON_TAI'); }
        if (goi.yeuCauThanhToan) {
            return repository.create({
                nguoiDungId: userId,
                goiDichVuId: goiId,
                trangThai: 'CHO_THANH_TOAN',
                nguonKichHoat: 'THANH_TOAN',
                giaThanhToan: goi.gia,
                tienTe: goi.tienTe,
                tuDongGiaHan: data.tuDongGiaHan === true
            }, db);
        }
        const goiHienTai = await repository.getHienTaiCuaNguoiDung(userId, db);
        if (goiHienTai) { throw taoLoi(409, 'Bạn đang có một gói dịch vụ hoạt động. Hãy kết thúc hoặc thay đổi gói hiện tại trước.', 'DA_CO_GOI_HOAT_DONG'); }
        const dangKyMoi = await repository.create({
            nguoiDungId: userId,
            goiDichVuId: goiId,
            trangThai: 'CHO_THANH_TOAN',
            nguonKichHoat: 'HE_THONG',
            giaThanhToan: 0,
            tienTe: goi.tienTe,
            tuDongGiaHan: false
        }, db);
        return repository.kichHoat(dangKyMoi.id, new Date(), null, db);
    });
}

async function ganGoi(data) {
    const userId = parseId(data.nguoiDungId, 'ID người dùng');
    const goiId = parseId(data.goiDichVuId, 'ID gói dịch vụ');
    const batDauLuc = kiemTraBatDauLuc(data.batDauLuc);
    return giaoDich(async (db) => {
        const nguoiDung = await repository.khoaNguoiDung(userId, db);
        if (!nguoiDung) { throw taoLoi(404, 'Người dùng không tồn tại.', 'NGUOI_DUNG_KHONG_TON_TAI'); }
        await repository.dongBoHetHan(userId, db);
        const goi = await layGoiHopLe(goiId, db);
        const dangMo = await repository.getDangMoCuaNguoiDungVaGoi(userId, goiId, db);
        if (dangMo) { throw taoLoi(409, 'Người dùng đã có đăng ký chưa kết thúc đối với gói này.', 'DANG_KY_GOI_DA_TON_TAI'); }
        const goiHienTai = await repository.getHienTaiCuaNguoiDung(userId, db);
        if (goiHienTai && !data.thayTheGoiHienTai) { throw taoLoi(409, 'Người dùng đang có một gói dịch vụ hoạt động.', 'DA_CO_GOI_HOAT_DONG'); }
        const dangKyMoi = await repository.create({
            nguoiDungId: userId,
            goiDichVuId: goiId,
            trangThai: 'CHO_THANH_TOAN',
            nguonKichHoat: 'QUAN_TRI',
            giaThanhToan: 0,
            tienTe: goi.tienTe,
            tuDongGiaHan: false,
            metadata: data.metadata || {}
        }, db);
        if (goiHienTai && data.thayTheGoiHienTai) { await repository.huyCacGoiDangSuDungKhac(userId, dangKyMoi.id, 'Thay thế gói bởi quản trị viên', db); }
        return repository.kichHoat(dangKyMoi.id, batDauLuc || new Date(), null, db);
    });
}

async function kichHoat(id, data = {}) {
    const dangKyId = parseId(id, 'ID đăng ký gói');
    const batDauLuc = kiemTraBatDauLuc(data.batDauLuc);
    return giaoDich(async (db) => {
        const dangKy = await repository.getByIdForUpdate(dangKyId, db);
        if (!dangKy) { throw taoLoi(404, 'Đăng ký gói không tồn tại.', 'DANG_KY_GOI_KHONG_TON_TAI'); }
        if (dangKy.trangThai !== 'CHO_THANH_TOAN') { throw taoLoi(400, 'Chỉ đăng ký đang chờ thanh toán mới có thể kích hoạt.', 'TRANG_THAI_DANG_KY_KHONG_HOP_LE'); }
        const nguoiDung = await repository.khoaNguoiDung(dangKy.nguoiDungId, db);
        if (!nguoiDung) { throw taoLoi(404, 'Người dùng không tồn tại.', 'NGUOI_DUNG_KHONG_TON_TAI'); }
        await repository.dongBoHetHan(dangKy.nguoiDungId, db);
        const goiHienTai = await repository.getHienTaiCuaNguoiDung(dangKy.nguoiDungId, db);
        if (goiHienTai && goiHienTai.id !== dangKyId && !data.thayTheGoiHienTai) { throw taoLoi(409, 'Người dùng đang có một gói dịch vụ hoạt động.', 'DA_CO_GOI_HOAT_DONG'); }
        if (goiHienTai && goiHienTai.id !== dangKyId && data.thayTheGoiHienTai) { await repository.huyCacGoiDangSuDungKhac(dangKy.nguoiDungId, dangKyId, 'Thay thế khi kích hoạt gói mới', db); }
        const ketQua = await repository.kichHoat(dangKyId, batDauLuc || new Date(), data.maGiaoDich || null, db);
        if (!ketQua) { throw taoLoi(400, 'Không thể kích hoạt đăng ký gói.', 'KHONG_THE_KICH_HOAT_GOI'); }
        return ketQua;
    });
}

async function tamDung(id) {
    const dangKyId = parseId(id, 'ID đăng ký gói');
    await repository.dongBoHetHan();
    const dangKy = await repository.getById(dangKyId);
    if (!dangKy) { throw taoLoi(404, 'Đăng ký gói không tồn tại.', 'DANG_KY_GOI_KHONG_TON_TAI'); }
    if (dangKy.trangThai !== 'HOAT_DONG') { throw taoLoi(400, 'Chỉ gói đang hoạt động mới có thể tạm dừng.', 'TRANG_THAI_DANG_KY_KHONG_HOP_LE'); }
    const ketQua = await repository.tamDung(dangKyId);
    if (!ketQua) { throw taoLoi(400, 'Không thể tạm dừng gói dịch vụ.', 'KHONG_THE_TAM_DUNG_GOI'); }
    return ketQua;
}

async function tiepTuc(id) {
    const dangKyId = parseId(id, 'ID đăng ký gói');
    return giaoDich(async (db) => {
        const dangKy = await repository.getByIdForUpdate(dangKyId, db);
        if (!dangKy) { throw taoLoi(404, 'Đăng ký gói không tồn tại.', 'DANG_KY_GOI_KHONG_TON_TAI'); }
        await repository.dongBoHetHan(dangKy.nguoiDungId, db);
        const capNhat = await repository.getByIdForUpdate(dangKyId, db);
        if (!capNhat || capNhat.trangThai !== 'TAM_DUNG') { throw taoLoi(400, 'Gói không ở trạng thái tạm dừng hoặc đã hết hạn.', 'TRANG_THAI_DANG_KY_KHONG_HOP_LE'); }
        await repository.khoaNguoiDung(capNhat.nguoiDungId, db);
        const goiHienTai = await repository.getHienTaiCuaNguoiDung(capNhat.nguoiDungId, db);
        if (goiHienTai && goiHienTai.id !== dangKyId) { throw taoLoi(409, 'Người dùng đang có một gói dịch vụ khác hoạt động.', 'DA_CO_GOI_HOAT_DONG'); }
        const ketQua = await repository.tiepTuc(dangKyId, db);
        if (!ketQua) { throw taoLoi(400, 'Không thể tiếp tục gói dịch vụ.', 'KHONG_THE_TIEP_TUC_GOI'); }
        return ketQua;
    });
}

async function huyCuaToi(id, nguoiDungId, data = {}) {
    const dangKyId = parseId(id, 'ID đăng ký gói');
    const userId = parseId(nguoiDungId, 'ID người dùng');
    const dangKy = await repository.getById(dangKyId);
    if (!dangKy || dangKy.nguoiDungId !== userId) { throw taoLoi(404, 'Đăng ký gói không tồn tại.', 'DANG_KY_GOI_KHONG_TON_TAI'); }
    const ketQua = await repository.huy(dangKyId, data.lyDo || 'Người dùng hủy gói', userId);
    if (!ketQua) { throw taoLoi(400, 'Gói dịch vụ không thể hủy ở trạng thái hiện tại.', 'KHONG_THE_HUY_GOI'); }
    return ketQua;
}

async function huyQuanTri(id, nguoiThucHienId, data = {}) {
    const dangKyId = parseId(id, 'ID đăng ký gói');
    const adminId = parseId(nguoiThucHienId, 'ID người thực hiện');
    const dangKy = await repository.getById(dangKyId);
    if (!dangKy) { throw taoLoi(404, 'Đăng ký gói không tồn tại.', 'DANG_KY_GOI_KHONG_TON_TAI'); }
    const ketQua = await repository.huy(dangKyId, data.lyDo || 'Quản trị viên hủy gói', adminId);
    if (!ketQua) { throw taoLoi(400, 'Gói dịch vụ không thể hủy ở trạng thái hiện tại.', 'KHONG_THE_HUY_GOI'); }
    return ketQua;
}

module.exports = {
    getDanhSach,
    getChiTiet,
    getCuaToi,
    getHienTai,
    dangKy,
    ganGoi,
    kichHoat,
    tamDung,
    tiepTuc,
    huyCuaToi,
    huyQuanTri
};