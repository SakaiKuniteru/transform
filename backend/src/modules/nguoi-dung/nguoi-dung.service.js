'use strict';
const bcrypt = require('bcrypt');
const env = require('../../config/env');
const MA_LOI = require('../../constants/ma-loi');
const {
    loiYeuCau,
    loiKhongTimThay,
    loiKhongCoQuyen,
    loiXungDot
} = require('../../utils/loi');
const repository = require('./nguoi-dung.repository');

function chuanHoaEmail(value) {
    return String(value).trim().toLowerCase();
}

function chuanHoaTenDangNhap(value) {
    if (value === null || value === undefined || value === '') { return null; }
    return String(value).trim().toLowerCase();
}

async function batBuocTonTai(id) {
    const nguoiDung = await repository.timTheoId(id);
    if (!nguoiDung) {
        throw loiKhongTimThay(
            'Không tìm thấy người dùng.',
            MA_LOI.NGUOI_DUNG_KHONG_TIM_THAY
        );
    }
    return nguoiDung;
}

function kiemTraTaiKhoanHeThong(nguoiDung) {
    if (nguoiDung.loaiTaiKhoan === 'HE_THONG') {
        throw loiKhongCoQuyen(
            'Không thể thay đổi tài khoản hệ thống bằng chức năng quản trị người dùng.',
            MA_LOI.KHONG_CO_QUYEN
        );
    }
}

async function kiemTraQuanTriCuoiCung(nguoiDung) {
    if (nguoiDung.loaiTaiKhoan !== 'QUAN_TRI' || nguoiDung.trangThai !== 'HOAT_DONG') { return; }
    const tongQuanTri = await repository.demQuanTriHoatDong();
    if (tongQuanTri <= 1) {
        throw loiXungDot(
            'Hệ thống phải còn ít nhất một tài khoản quản trị đang hoạt động.',
            MA_LOI.XUNG_DOT_DU_LIEU
        );
    }
}

async function kiemTraEmail(email, boQuaId = null) {
    const tonTai = await repository.emailDaTonTai(email, boQuaId);
    if (tonTai) {
        throw loiXungDot(
            'Email đã được sử dụng.',
            MA_LOI.EMAIL_DA_TON_TAI
        );
    }
}

async function kiemTraTenDangNhap(tenDangNhap, boQuaId = null) {
    if (!tenDangNhap) { return; }
    const tonTai = await repository.tenDangNhapDaTonTai(tenDangNhap, boQuaId);
    if (tonTai) {
        throw loiXungDot(
            'Tên đăng nhập đã được sử dụng.',
            MA_LOI.TEN_DANG_NHAP_DA_TON_TAI
        );
    }
}

async function layDanhSach({
    page = 1,
    pageSize = 20,
    tuKhoa = null,
    loaiTaiKhoan = null,
    trangThai = null
} = {}) {
    const ketQua = await repository.layDanhSach({
        page,
        pageSize,
        tuKhoa,
        loaiTaiKhoan,
        trangThai
    });
    return {
        danhSach: ketQua.danhSach,
        tong: ketQua.tong,
        page,
        pageSize
    };
}

async function layChiTiet(id) {
    return batBuocTonTai(id);
}

async function layHienTai(nguoiDungId) {
    if (!nguoiDungId) {
        throw loiYeuCau(
            'Không xác định được người dùng hiện tại.',
            MA_LOI.YEU_CAU_KHONG_HOP_LE
        );
    }
    return batBuocTonTai(nguoiDungId);
}

async function taoMoi({
    email,
    tenDangNhap = null,
    hoTen,
    matKhau,
    loaiTaiKhoan = 'NGUOI_DUNG',
    trangThai = 'HOAT_DONG',
    emailDaXacThuc = false,
    caiDat = {}
}) {
    const emailChuan = chuanHoaEmail(email);
    const tenDangNhapChuan = chuanHoaTenDangNhap(tenDangNhap);
    await kiemTraEmail(emailChuan);
    await kiemTraTenDangNhap(tenDangNhapChuan);
    const matKhauHash = await bcrypt.hash(
        matKhau,
        env.baoMat.bcryptRounds
    );
    return repository.taoMoi({
        email: emailChuan,
        tenDangNhap: tenDangNhapChuan,
        hoTen: hoTen.trim(),
        matKhauHash,
        loaiTaiKhoan,
        trangThai,
        emailXacThucLuc: emailDaXacThuc ? new Date() : null,
        caiDat
    });
}

async function capNhat(id, duLieu, nguoiThucHienId = null) {
    const nguoiDung = await batBuocTonTai(id);
    kiemTraTaiKhoanHeThong(nguoiDung);
    const duLieuCapNhat = {};
    if (Object.hasOwn(duLieu, 'email')) {
        const email = chuanHoaEmail(duLieu.email);
        if (email !== nguoiDung.email.toLowerCase()) {
            await kiemTraEmail(email, id);
            duLieuCapNhat.email = email;
        }
    }
    if (Object.hasOwn(duLieu, 'tenDangNhap')) {
        const tenDangNhap = chuanHoaTenDangNhap(duLieu.tenDangNhap);
        if (tenDangNhap !== chuanHoaTenDangNhap(nguoiDung.tenDangNhap)) {
            await kiemTraTenDangNhap(tenDangNhap, id);
            duLieuCapNhat.tenDangNhap = tenDangNhap;
        }
    }
    if (Object.hasOwn(duLieu, 'hoTen')) { duLieuCapNhat.hoTen = duLieu.hoTen.trim(); }
    if (Object.hasOwn(duLieu, 'caiDat')) { duLieuCapNhat.caiDat = duLieu.caiDat; }
    if (Object.hasOwn(duLieu, 'loaiTaiKhoan') && duLieu.loaiTaiKhoan !== nguoiDung.loaiTaiKhoan) {
        if (nguoiThucHienId === id) {
            throw loiKhongCoQuyen(
                'Bạn không thể tự thay đổi loại tài khoản của chính mình.',
                MA_LOI.KHONG_CO_QUYEN
            );
        }
        if (nguoiDung.loaiTaiKhoan === 'QUAN_TRI') { await kiemTraQuanTriCuoiCung(nguoiDung); }
        duLieuCapNhat.loaiTaiKhoan = duLieu.loaiTaiKhoan;
    }
    if (!Object.keys(duLieuCapNhat).length) { return nguoiDung; }
    const ketQua = await repository.capNhat(id, duLieuCapNhat);
    if (!ketQua) {
        throw loiKhongTimThay(
            'Không tìm thấy người dùng.',
            MA_LOI.NGUOI_DUNG_KHONG_TIM_THAY
        );
    }
    return ketQua;
}

async function capNhatHienTai(nguoiDungId, duLieu) {
    const nguoiDung = await batBuocTonTai(nguoiDungId);
    const duLieuCapNhat = {};
    if (Object.hasOwn(duLieu, 'tenDangNhap')) {
        const tenDangNhap = chuanHoaTenDangNhap(duLieu.tenDangNhap);
        if (tenDangNhap !== chuanHoaTenDangNhap(nguoiDung.tenDangNhap)) {
            await kiemTraTenDangNhap(tenDangNhap, nguoiDungId);
            duLieuCapNhat.tenDangNhap = tenDangNhap;
        }
    }
    if (Object.hasOwn(duLieu, 'hoTen')) { duLieuCapNhat.hoTen = duLieu.hoTen.trim(); }
    if (Object.hasOwn(duLieu, 'caiDat')) { duLieuCapNhat.caiDat = duLieu.caiDat; }
    if (!Object.keys(duLieuCapNhat).length) { return nguoiDung; }
    return repository.capNhat(nguoiDungId, duLieuCapNhat);
}

async function capNhatTrangThai(id, trangThai, nguoiThucHienId = null) {
    const nguoiDung = await batBuocTonTai(id);
    kiemTraTaiKhoanHeThong(nguoiDung);
    if (nguoiDung.trangThai === trangThai) { return nguoiDung; }
    if (nguoiThucHienId === id && trangThai !== 'HOAT_DONG') {
        throw loiKhongCoQuyen(
            'Bạn không thể tự khóa hoặc vô hiệu hóa tài khoản của chính mình.',
            MA_LOI.KHONG_CO_QUYEN
        );
    }
    if (nguoiDung.loaiTaiKhoan === 'QUAN_TRI' && nguoiDung.trangThai === 'HOAT_DONG' && trangThai !== 'HOAT_DONG') {
        await kiemTraQuanTriCuoiCung(nguoiDung);
    }
    const ketQua = await repository.capNhatTrangThai(id, trangThai);
    if (!ketQua) {
        throw loiKhongTimThay(
            'Không tìm thấy người dùng.',
            MA_LOI.NGUOI_DUNG_KHONG_TIM_THAY
        );
    }
    return ketQua;
}

async function xoa(id, nguoiThucHienId = null) {
    const nguoiDung = await batBuocTonTai(id);
    kiemTraTaiKhoanHeThong(nguoiDung);
    if (nguoiThucHienId === id) {
        throw loiKhongCoQuyen(
            'Bạn không thể tự xóa tài khoản của chính mình.',
            MA_LOI.KHONG_CO_QUYEN
        );
    }
    if (nguoiDung.loaiTaiKhoan === 'QUAN_TRI' && nguoiDung.trangThai === 'HOAT_DONG') {
        await kiemTraQuanTriCuoiCung(nguoiDung);
    }
    const ketQua = await repository.xoaMem(id);
    if (!ketQua) {
        throw loiKhongTimThay(
            'Không tìm thấy người dùng.',
            MA_LOI.NGUOI_DUNG_KHONG_TIM_THAY
        );
    }
    return ketQua;
}

module.exports = {
    layDanhSach,
    layChiTiet,
    layHienTai,
    taoMoi,
    capNhat,
    capNhatHienTai,
    capNhatTrangThai,
    xoa
};