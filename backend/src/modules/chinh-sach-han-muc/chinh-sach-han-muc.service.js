'use strict';

const repository = require('./chinh-sach-han-muc.repository');

const {
    DOI_TUONG_HAN_MUC,
    DON_VI_HAN_MUC,
    CHU_KY_HAN_MUC,
    MA_HAN_MUC
} = require('../../constants/han-muc');

const {
    kiemTraMuiGio
} = require('../han-muc/han-muc.util');

function taoLoi(statusCode, message, code = 'LOI_CHINH_SACH_HAN_MUC') {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    return error;
}

function parseId(value, ten = 'ID chính sách hạn mức') {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) { throw taoLoi(400, `${ten} không hợp lệ.`, 'ID_KHONG_HOP_LE'); }
    return id;
}

function chuanHoaMa(value) { return String(value).trim().toUpperCase(); }

function chuanHoaChuoi(value) {
    if (value === undefined) { return undefined; }
    if (value === null) { return null; }
    return String(value).trim();
}

function chuanHoaThoiGian(value) {
    if (value === undefined) { return undefined; }
    if (value === null) { return null; }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) { throw taoLoi(400, 'Thời gian hiệu lực không hợp lệ.', 'THOI_GIAN_KHONG_HOP_LE'); }
    return date;
}

function chuanHoaDuLieu(data = {}) {
    const result = { ...data };
    if (data.ma !== undefined) { result.ma = chuanHoaMa(data.ma); }
    if (data.ten !== undefined) { result.ten = String(data.ten).trim(); }
    if (data.doiTuong !== undefined) { result.doiTuong = chuanHoaMa(data.doiTuong); }
    if (data.loaiTaiKhoan !== undefined) { result.loaiTaiKhoan = data.loaiTaiKhoan === null ? null : chuanHoaMa(data.loaiTaiKhoan); }
    if (data.goiDichVuId !== undefined) { result.goiDichVuId = data.goiDichVuId === null ? null : parseId(data.goiDichVuId, 'ID gói dịch vụ'); }
    if (data.maHanhDong !== undefined) { result.maHanhDong = chuanHoaMa(data.maHanhDong); }
    if (data.donVi !== undefined) { result.donVi = chuanHoaMa(data.donVi); }
    if (data.chuKy !== undefined) { result.chuKy = chuanHoaMa(data.chuKy); }
    if (data.muiGio !== undefined) {
        try {
            result.muiGio = kiemTraMuiGio(data.muiGio);
        } catch {
            throw taoLoi(400, 'Múi giờ chính sách không hợp lệ.', 'MUI_GIO_KHONG_HOP_LE');
        }
    }
    if (data.gioiHan !== undefined) {
        if (data.gioiHan === null) {
            result.gioiHan = null;
        } else {
            const gioiHan = Number(data.gioiHan);
            if (!Number.isSafeInteger(gioiHan) || gioiHan < 0) { throw taoLoi(400, 'Giới hạn không hợp lệ.', 'GIOI_HAN_KHONG_HOP_LE'); }
            result.gioiHan = gioiHan;
        }
    }
    if (data.hanhDongKhiVuot !== undefined) { result.hanhDongKhiVuot = chuanHoaMa(data.hanhDongKhiVuot); }
    if (data.hieuLucTu !== undefined) { result.hieuLucTu = chuanHoaThoiGian(data.hieuLucTu); }
    if (data.hieuLucDen !== undefined) { result.hieuLucDen = chuanHoaThoiGian(data.hieuLucDen); }
    return result;
}

function ghepDuLieu(hienTai, capNhat) {
    return {
        ma: capNhat.ma ?? hienTai.ma,
        ten: capNhat.ten ?? hienTai.ten,
        doiTuong: capNhat.doiTuong ?? hienTai.doiTuong,
        loaiTaiKhoan: capNhat.loaiTaiKhoan !== undefined ? capNhat.loaiTaiKhoan : hienTai.loaiTaiKhoan,
        goiDichVuId: capNhat.goiDichVuId !== undefined ? capNhat.goiDichVuId : hienTai.goiDichVuId,
        maHanhDong: capNhat.maHanhDong ?? hienTai.maHanhDong,
        donVi: capNhat.donVi ?? hienTai.donVi,
        chuKy: capNhat.chuKy ?? hienTai.chuKy,
        muiGio: capNhat.muiGio ?? hienTai.muiGio,
        gioiHan: capNhat.gioiHan !== undefined ? capNhat.gioiHan : hienTai.gioiHan,
        khongGioiHan: capNhat.khongGioiHan ?? hienTai.khongGioiHan,
        hanhDongKhiVuot: capNhat.hanhDongKhiVuot ?? hienTai.hanhDongKhiVuot,
        mucDoUuTien: capNhat.mucDoUuTien ?? hienTai.mucDoUuTien,
        hieuLucTu: capNhat.hieuLucTu ?? hienTai.hieuLucTu,
        hieuLucDen: capNhat.hieuLucDen !== undefined ? capNhat.hieuLucDen : hienTai.hieuLucDen,
        active: capNhat.active ?? hienTai.active,
        metadata: capNhat.metadata ?? hienTai.metadata
    };
}

function kiemTraQuanHe(data) {
    if (data.doiTuong === DOI_TUONG_HAN_MUC.KHACH || data.doiTuong === DOI_TUONG_HAN_MUC.NGUOI_DUNG) {
        if (data.loaiTaiKhoan !== null || data.goiDichVuId !== null) { 
            throw taoLoi(400, 'Đối tượng KHACH hoặc NGUOI_DUNG không được có loại tài khoản hoặc gói dịch vụ.', 'DOI_TUONG_HAN_MUC_KHONG_HOP_LE'); 
        }
    }
    if (data.doiTuong === DOI_TUONG_HAN_MUC.LOAI_TAI_KHOAN) {
        if (!data.loaiTaiKhoan || data.goiDichVuId !== null) { 
            throw taoLoi(400, 'Đối tượng LOAI_TAI_KHOAN phải khai báo loaiTaiKhoan.', 'DOI_TUONG_HAN_MUC_KHONG_HOP_LE'); 
        }
    }
    if (data.doiTuong === DOI_TUONG_HAN_MUC.GOI_DICH_VU) {
        if (!data.goiDichVuId || data.loaiTaiKhoan !== null) { 
            throw taoLoi(400, 'Đối tượng GOI_DICH_VU phải khai báo goiDichVuId.', 'DOI_TUONG_HAN_MUC_KHONG_HOP_LE'); 
        }
    }
    if (data.khongGioiHan && data.gioiHan !== null) { 
        throw taoLoi(400, 'Chính sách không giới hạn phải có gioiHan bằng null.', 'GIOI_HAN_KHONG_HOP_LE'); 
    }
    if (!data.khongGioiHan && data.gioiHan === null) { 
        throw taoLoi(400, 'Chính sách hữu hạn phải khai báo gioiHan.', 'GIOI_HAN_KHONG_HOP_LE'); 
    }
    if (data.maHanhDong === MA_HAN_MUC.UPLOAD_TONG_SO_TEP && (data.donVi !== DON_VI_HAN_MUC.TEP || data.chuKy !== CHU_KY_HAN_MUC.THEO_GOI)) { 
        throw taoLoi(400, 'UPLOAD_TONG_SO_TEP phải dùng TEP/THEO_GOI.', 'CHINH_SACH_UPLOAD_KHONG_HOP_LE'); 
    }
    if (data.maHanhDong === MA_HAN_MUC.UPLOAD_SO_TEP_MOI_LAN && (data.donVi !== DON_VI_HAN_MUC.TEP || data.chuKy !== CHU_KY_HAN_MUC.MOI_REQUEST || data.khongGioiHan)) { 
        throw taoLoi(400, 'UPLOAD_SO_TEP_MOI_LAN phải dùng TEP/MOI_REQUEST và không được không giới hạn.', 'CHINH_SACH_UPLOAD_KHONG_HOP_LE'); 
    }
    if (data.maHanhDong === MA_HAN_MUC.UPLOAD_KICH_THUOC_MOI_TEP && (data.donVi !== DON_VI_HAN_MUC.BYTE || data.chuKy !== CHU_KY_HAN_MUC.MOI_TEP || data.khongGioiHan)) { 
        throw taoLoi(400, 'UPLOAD_KICH_THUOC_MOI_TEP phải dùng BYTE/MOI_TEP và không được không giới hạn.', 'CHINH_SACH_UPLOAD_KHONG_HOP_LE'); 
    }
    if (data.hieuLucDen && new Date(data.hieuLucTu) >= new Date(data.hieuLucDen)) { 
        throw taoLoi(400, 'Thời gian bắt đầu hiệu lực phải nhỏ hơn thời gian kết thúc hiệu lực.', 'HIEU_LUC_KHONG_HOP_LE'); 
    }
}

async function kiemTraGoiDichVu(data) {
    if (data.doiTuong !== DOI_TUONG_HAN_MUC.GOI_DICH_VU) { return; }
    const goi = await repository.getGoiDichVuById(data.goiDichVuId);
    if (!goi) { throw taoLoi(404, 'Gói dịch vụ không tồn tại.', 'GOI_DICH_VU_KHONG_TON_TAI'); }
}

async function getDanhSach(query = {}) {
    return repository.getDanhSach(query);
}

async function getChiTiet(id) {
    const chinhSachId = parseId(id);
    const chinhSach = await repository.getById(chinhSachId);
    if (!chinhSach) { throw taoLoi(404, 'Chính sách hạn mức không tồn tại.', 'CHINH_SACH_HAN_MUC_KHONG_TON_TAI'); }
    return chinhSach;
}

async function create(data) {
    const duLieu = chuanHoaDuLieu(data);
    kiemTraQuanHe(duLieu);
    await kiemTraGoiDichVu(duLieu);
    const trungMa = await repository.getByMa(duLieu.ma);
    if (trungMa) { throw taoLoi(409, 'Mã chính sách hạn mức đã tồn tại.', 'MA_CHINH_SACH_HAN_MUC_DA_TON_TAI'); }
    try {
        return await repository.create(duLieu);
    } catch (error) {
        if (error.code === '23505') { throw taoLoi(409, 'Mã chính sách hạn mức đã tồn tại.', 'MA_CHINH_SACH_HAN_MUC_DA_TON_TAI'); }
        throw error;
    }
}

async function update(id, data) {
    const chinhSachId = parseId(id);
    const hienTai = await getChiTiet(chinhSachId);
    const capNhat = chuanHoaDuLieu(data);
    const dayDu = ghepDuLieu(hienTai, capNhat);
    kiemTraQuanHe(dayDu);
    await kiemTraGoiDichVu(dayDu);
    if (capNhat.ma !== undefined) {
        const trungMa = await repository.getByMa(capNhat.ma, chinhSachId);
        if (trungMa) { throw taoLoi(409, 'Mã chính sách hạn mức đã tồn tại.', 'MA_CHINH_SACH_HAN_MUC_DA_TON_TAI'); }
    }
    try {
        const ketQua = await repository.update(chinhSachId, capNhat);
        if (!ketQua) { throw taoLoi(404, 'Chính sách hạn mức không tồn tại.', 'CHINH_SACH_HAN_MUC_KHONG_TON_TAI'); }
        return ketQua;
    } catch (error) {
        if (error.code === '23505') { throw taoLoi(409, 'Mã chính sách hạn mức đã tồn tại.', 'MA_CHINH_SACH_HAN_MUC_DA_TON_TAI'); }
        throw error;
    }
}

async function updateTrangThai(id, active) {
    const chinhSachId = parseId(id);
    await getChiTiet(chinhSachId);
    const ketQua = await repository.updateTrangThai(chinhSachId, active);
    if (!ketQua) { throw taoLoi(404, 'Chính sách hạn mức không tồn tại.', 'CHINH_SACH_HAN_MUC_KHONG_TON_TAI'); }
    return ketQua;
}

async function xoa(id) {
    const chinhSachId = parseId(id);
    await getChiTiet(chinhSachId);
    const ketQua = await repository.xoa(chinhSachId);
    if (!ketQua) { throw taoLoi(404, 'Chính sách hạn mức không tồn tại.', 'CHINH_SACH_HAN_MUC_KHONG_TON_TAI'); }
    return true;
}

module.exports = {
    getDanhSach,
    getChiTiet,
    create,
    update,
    updateTrangThai,
    xoa
};