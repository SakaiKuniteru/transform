'use strict';

const repository = require('./goi-dich-vu.repository');
const MA_LOI = require('../../constants/ma-loi');
const { taoLoiTheoStatus: taoLoi } = require('../../utils/loi');
const { CHU_KY_GOI_DICH_VU } = require('../../constants/trang-thai-goi');

function parseId(value) {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) {
        throw taoLoi(400, 'ID gói dịch vụ không hợp lệ.', MA_LOI.ID_KHONG_HOP_LE);
    }
    return id;
}

function chuanHoaMa(value) { return String(value).trim().toUpperCase(); }
function chuanHoaTienTe(value) { return String(value || 'VND').trim().toUpperCase(); }

function chuanHoaMoTa(value) {
    if (value === undefined) { return undefined; }
    if (value === null) { return null; }
    return String(value).trim() || null;
}

function chuanHoaDuLieu(data, current = null) {
    const result = { ...data };
    if (data.ma !== undefined) { result.ma = chuanHoaMa(data.ma); }
    if (data.ten !== undefined) { result.ten = String(data.ten).trim(); }
    if (data.moTa !== undefined) { result.moTa = chuanHoaMoTa(data.moTa); }
    if (data.tienTe !== undefined) { result.tienTe = chuanHoaTienTe(data.tienTe); }
    const yeuCauThanhToan = data.yeuCauThanhToan ?? current?.yeuCauThanhToan;
    const gia = data.gia ?? current?.gia;
    const chuKy = data.chuKy ?? current?.chuKy;
    if (yeuCauThanhToan === false) { result.gia = 0; }
    if (yeuCauThanhToan === true && Number(gia) < 0) {
        throw taoLoi(400, 'Giá gói dịch vụ không hợp lệ.', MA_LOI.GIA_KHONG_HOP_LE);
    }
    if (chuKy === CHU_KY_GOI_DICH_VU.MOT_LAN) { result.soChuKy = 1; }
    return result;
}

async function getDanhSach(query = {}) {
    return repository.getDanhSach(query);
}

async function getChiTiet(id) {
    const goiId = parseId(id);
    const goi = await repository.getById(goiId);
    if (!goi) { throw taoLoi(404, 'Gói dịch vụ không tồn tại.', MA_LOI.GOI_DICH_VU_KHONG_TIM_THAY); }
    return goi;
}

async function create(data) {
    const duLieu = chuanHoaDuLieu(data);
    const daTonTai = await repository.getByMa(duLieu.ma);
    if (daTonTai) {
        throw taoLoi(409, 'Mã gói dịch vụ đã tồn tại.', MA_LOI.MA_GOI_DICH_VU_DA_TON_TAI);
    }
    try {
        return await repository.create(duLieu);
    } catch (error) {
        if (error.code === '23505') {
            throw taoLoi(409, 'Mã gói dịch vụ đã tồn tại.', MA_LOI.MA_GOI_DICH_VU_DA_TON_TAI);
        }
        throw error;
    }
}

async function update(id, data) {
    const goiId = parseId(id);
    const hienTai = await getChiTiet(goiId);
    const duLieu = chuanHoaDuLieu(data, hienTai);
    if (duLieu.ma !== undefined) {
        const trungMa = await repository.getByMa(duLieu.ma, goiId);
        if (trungMa) {
            throw taoLoi(409, 'Mã gói dịch vụ đã tồn tại.', MA_LOI.MA_GOI_DICH_VU_DA_TON_TAI);
        }
    }
    const ketQua = await repository.update(goiId, duLieu);
    if (!ketQua) { throw taoLoi(404, 'Gói dịch vụ không tồn tại.', MA_LOI.GOI_DICH_VU_KHONG_TIM_THAY); }
    return ketQua;
}

async function updateTrangThai(id, active) {
    const goiId = parseId(id);
    await getChiTiet(goiId);
    const ketQua = await repository.updateTrangThai(goiId, active);
    if (!ketQua) { throw taoLoi(404, 'Gói dịch vụ không tồn tại.', MA_LOI.GOI_DICH_VU_KHONG_TIM_THAY); }
    return ketQua;
}

async function xoa(id) {
    const goiId = parseId(id);
    await getChiTiet(goiId);
    const dangSuDung = await repository.demDangKyDangSuDung(goiId);
    if (dangSuDung > 0) {
        throw taoLoi(409, 'Gói dịch vụ đang có đăng ký chưa kết thúc nên không thể xóa.', MA_LOI.GOI_DICH_VU_DANG_DUOC_SU_DUNG);
    }
    const ketQua = await repository.softDelete(goiId);
    if (!ketQua) { throw taoLoi(404, 'Gói dịch vụ không tồn tại.', MA_LOI.GOI_DICH_VU_KHONG_TIM_THAY); }
    return ketQua;
}

module.exports = {
    getDanhSach,
    getChiTiet,
    create,
    update,
    updateTrangThai,
    xoa
};