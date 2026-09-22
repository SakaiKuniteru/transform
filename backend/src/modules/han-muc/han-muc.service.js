'use strict';

const repository = require('./han-muc.repository');
const MA_LOI = require('../../constants/ma-loi');
const { taoLoiTheoStatus: taoLoi } = require('../../utils/loi');
const { LOAI_TAI_KHOAN } = require('../../constants/loai-tai-khoan');
const {
    taoKyHanMuc,
    chuyenBigInt,
    bigIntRaJson,
    tinhConLai,
    taoLoiVuotHanMuc,
    batBuocDate
} = require('./han-muc.util');
const { CHU_KY_HAN_MUC, DANH_SACH_MA_HAN_MUC } = require('../../constants/han-muc');
const { giaoDich, ISOLATION_LEVEL } = require('../../infrastructure/database/transaction');
const TAI_KHOAN_KHONG_GIOI_HAN = new Set([ LOAI_TAI_KHOAN.QUAN_TRI, LOAI_TAI_KHOAN.HE_THONG ]);

function parseId(value, ten) {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) { throw taoLoi(400, `${ten} không hợp lệ.`, MA_LOI.ID_KHONG_HOP_LE); }
    return id;
}

function parseSoLuong(value) {
    const soLuong = Number(value);
    if (!Number.isSafeInteger(soLuong) || soLuong <= 0) { throw taoLoi(400, 'Số lượng sử dụng hạn mức không hợp lệ.', MA_LOI.SO_LUONG_KHONG_HOP_LE); }
    return soLuong;
}

function chuanHoaMaHanhDong(value) {
    const ma = String(value || '').trim().toUpperCase();
    if (!ma || ma.length > 50) { throw taoLoi(400, 'Mã hành động hạn mức không hợp lệ.', MA_LOI.MA_HANH_DONG_KHONG_HOP_LE); }
    return ma;
}

function chuanHoaThoiDiem(value) {
    if (value === undefined || value === null) { return new Date(); }
    try {
        return batBuocDate(value);
    } catch {
        throw taoLoi(400, 'Thời điểm kiểm tra hạn mức không hợp lệ.', MA_LOI.THOI_DIEM_KHONG_HOP_LE);
    }
}

function chuanHoaChuThe(input = {}) {
    const coNguoiDung = input.nguoiDungId !== undefined && input.nguoiDungId !== null;
    const coPhienKhach = input.phienKhachId !== undefined && input.phienKhachId !== null;
    if (coNguoiDung === coPhienKhach) { throw taoLoi(400, 'Phải xác định duy nhất người dùng hoặc phiên khách.', MA_LOI.CHU_THE_HAN_MUC_KHONG_HOP_LE); }
    return {
        nguoiDungId: coNguoiDung ? parseId(input.nguoiDungId, 'ID người dùng') : null,
        phienKhachId: coPhienKhach ? parseId(input.phienKhachId, 'ID phiên khách') : null
    };
}

async function resolveChuThe(input, thoiDiem, db = null) {
    const chuThe = chuanHoaChuThe(input);
    if (chuThe.nguoiDungId) {
        const nguoiDung = await repository.getNguoiDungContext(chuThe.nguoiDungId, thoiDiem, db);
        if (!nguoiDung) { throw taoLoi(404, 'Người dùng không tồn tại.', MA_LOI.NGUOI_DUNG_KHONG_TIM_THAY); }
        if (nguoiDung.trangThai !== 'HOAT_DONG') { throw taoLoi(403, 'Tài khoản hiện không hoạt động.', MA_LOI.TAI_KHOAN_KHONG_HOAT_DONG); }
        return {
            ...chuThe,
            laKhach: false,
            loaiTaiKhoan: nguoiDung.loaiTaiKhoan,
            dangKyGoi: nguoiDung.dangKyGoi,
            goiDichVuId: nguoiDung.dangKyGoi?.goiDichVuId || null,
            khongGioiHanHeThong: TAI_KHOAN_KHONG_GIOI_HAN.has(nguoiDung.loaiTaiKhoan)
        };
    }
    const phienKhach = await repository.getPhienKhachContext(chuThe.phienKhachId, thoiDiem, db);
    if (!phienKhach) { throw taoLoi(401, 'Phiên khách không tồn tại hoặc đã hết hiệu lực.', MA_LOI.PHIEN_KHACH_KHONG_HOP_LE); }
    return {
        ...chuThe,
        laKhach: true,
        loaiTaiKhoan: null,
        dangKyGoi: null,
        goiDichVuId: null,
        khongGioiHanHeThong: false
    };
}

function taoChinhSachKhongGioiHan(maHanhDong) {
    return {
        id: null,
        ma: 'HE_THONG_KHONG_GIOI_HAN',
        ten: 'Không giới hạn hệ thống',
        doiTuong: 'LOAI_TAI_KHOAN',
        loaiTaiKhoan: null,
        goiDichVuId: null,
        maHanhDong,
        donVi: null,
        chuKy: CHU_KY_HAN_MUC.TOAN_THOI_GIAN,
        muiGio: 'UTC',
        gioiHan: null,
        khongGioiHan: true,
        hanhDongKhiVuot: null,
        mucDoUuTien: 1,
        metadata: {}
    };
}

async function resolveChinhSach(input, db = null) {
    const maHanhDong = chuanHoaMaHanhDong(input.maHanhDong);
    const thoiDiem = chuanHoaThoiDiem(input.thoiDiem);
    const chuThe = await resolveChuThe(input, thoiDiem, db);
    if (chuThe.khongGioiHanHeThong) {
        return {
            chinhSach: taoChinhSachKhongGioiHan(maHanhDong),
            chuThe,
            thoiDiem
        };
    }
    const chinhSach = await repository.getChinhSachHieuLuc({
        maHanhDong,
        laKhach: chuThe.laKhach,
        loaiTaiKhoan: chuThe.loaiTaiKhoan,
        goiDichVuId: chuThe.goiDichVuId,
        thoiDiem
    }, db);
    if (!chinhSach) { throw taoLoi(500, `Chưa cấu hình chính sách hạn mức cho hành động "${maHanhDong}".`, MA_LOI.CHINH_SACH_HAN_MUC_CHUA_CAU_HINH); }
    return {
        chinhSach,
        chuThe,
        thoiDiem
    };
}

async function layTinhTrang(input, db = null) {
    const resolved = await resolveChinhSach(input, db);
    const { chinhSach, chuThe, thoiDiem } = resolved;
    if (chinhSach.khongGioiHan) {
        return {
            duocPhep: true,
            chinhSach,
            chuThe,
            ky: null,
            gioiHan: null,
            daSuDung: 0,
            conLai: null
        };
    }
    const ky = taoKyHanMuc(chinhSach, {
        dangKyGoi: chuThe.dangKyGoi
    }, thoiDiem);
    if (!ky.theoDoi) {
        return {
            duocPhep: true,
            chinhSach,
            chuThe,
            ky,
            gioiHan: bigIntRaJson(chinhSach.gioiHan),
            daSuDung: 0,
            conLai: bigIntRaJson(chinhSach.gioiHan)
        };
    }
    const suDung = await repository.getSuDung({
        nguoiDungId: chuThe.nguoiDungId,
        phienKhachId: chuThe.phienKhachId,
        maHanhDong: chinhSach.maHanhDong,
        donVi: chinhSach.donVi,
        kyBatDau: ky.kyBatDau,
        kyKetThuc: ky.kyKetThuc
    }, db);
    const daSuDung = chuyenBigInt(suDung?.daSuDung || 0);
    const conLai = tinhConLai(chinhSach.gioiHan, daSuDung);
    return {
        duocPhep: conLai > 0n,
        chinhSach,
        chuThe,
        ky,
        gioiHan: bigIntRaJson(chinhSach.gioiHan),
        daSuDung: bigIntRaJson(daSuDung),
        conLai: bigIntRaJson(conLai)
    };
}

async function kiemTraHanMuc(input, db = null) {
    const soLuong = parseSoLuong(input.soLuong);
    const tinhTrang = await layTinhTrang(input, db);
    if (tinhTrang.chinhSach.khongGioiHan) {
        return {
            ...tinhTrang,
            duocPhep: true,
            soLuongYeuCau: soLuong
        };
    }
    const soLuongBigInt = BigInt(soLuong);
    const duocPhep = tinhTrang.ky?.theoDoi
        ? soLuongBigInt <= chuyenBigInt(tinhTrang.conLai)
        : soLuongBigInt <= chuyenBigInt(tinhTrang.chinhSach.gioiHan);
    return {
        ...tinhTrang,
        duocPhep,
        soLuongYeuCau: soLuong
    };
}

async function batBuocHanMuc(input, db = null) {
    const ketQua = await kiemTraHanMuc(input, db);
    if (!ketQua.duocPhep) {
        throw taoLoiVuotHanMuc(ketQua.chinhSach, {
            maHanhDong: ketQua.chinhSach.maHanhDong,
            gioiHan: ketQua.gioiHan,
            daSuDung: ketQua.daSuDung,
            conLai: ketQua.conLai,
            soLuongYeuCau: ketQua.soLuongYeuCau
        });
    }
    return ketQua;
}

async function giuHanMucTrongGiaoDich(input, db) {
    const soLuong = parseSoLuong(input.soLuong);
    const resolved = await resolveChinhSach(input, db);
    const { chinhSach, chuThe, thoiDiem } = resolved;
    if (chinhSach.khongGioiHan) {
        return {
            duocPhep: true,
            theoDoi: false,
            khongGioiHan: true,
            maHanhDong: chinhSach.maHanhDong,
            soLuong
        };
    }
    const ky = taoKyHanMuc(chinhSach, {
        dangKyGoi: chuThe.dangKyGoi
    }, thoiDiem);
    if (!ky.theoDoi) {
        if (BigInt(soLuong) > chuyenBigInt(chinhSach.gioiHan)) {
            throw taoLoiVuotHanMuc(chinhSach, {
                maHanhDong: chinhSach.maHanhDong,
                gioiHan: bigIntRaJson(chinhSach.gioiHan),
                daSuDung: 0,
                conLai: bigIntRaJson(chinhSach.gioiHan),
                soLuongYeuCau: soLuong
            });
        }
        return {
            duocPhep: true,
            theoDoi: false,
            khongGioiHan: false,
            maHanhDong: chinhSach.maHanhDong,
            soLuong
        };
    }
    const suDung = await repository.giuSuDung({
        nguoiDungId: chuThe.nguoiDungId,
        phienKhachId: chuThe.phienKhachId,
        chinhSachHanMucId: chinhSach.id,
        maHanhDong: chinhSach.maHanhDong,
        donVi: chinhSach.donVi,
        kyBatDau: ky.kyBatDau,
        kyKetThuc: ky.kyKetThuc,
        soLuong,
        gioiHan: chinhSach.gioiHan
    }, db);
    if (!suDung) {
        const tinhTrang = await layTinhTrang(input, db);
        throw taoLoiVuotHanMuc(chinhSach, {
            maHanhDong: chinhSach.maHanhDong,
            gioiHan: tinhTrang.gioiHan,
            daSuDung: tinhTrang.daSuDung,
            conLai: tinhTrang.conLai,
            soLuongYeuCau: soLuong
        });
    }
    return {
        duocPhep: true,
        theoDoi: true,
        khongGioiHan: false,
        nguoiDungId: chuThe.nguoiDungId,
        phienKhachId: chuThe.phienKhachId,
        chinhSachHanMucId: chinhSach.id,
        maHanhDong: chinhSach.maHanhDong,
        donVi: chinhSach.donVi,
        kyBatDau: ky.kyBatDau,
        kyKetThuc: ky.kyKetThuc,
        soLuong,
        gioiHan: bigIntRaJson(chinhSach.gioiHan),
        daSuDung: bigIntRaJson(suDung.daSuDung),
        conLai: bigIntRaJson(tinhConLai(chinhSach.gioiHan, suDung.daSuDung)),
        dangKyGoiId: ky.dangKyGoiId || null
    };
}

async function giuHanMuc(input) {
    return giaoDich((db) => giuHanMucTrongGiaoDich(input, db), {
        isolationLevel: ISOLATION_LEVEL.READ_COMMITTED,
        soLanThuLai: 2
    });
}

async function giuNhieuHanMuc(danhSachInput) {
    if (!Array.isArray(danhSachInput) || danhSachInput.length === 0) { throw new TypeError('Danh sách hạn mức cần giữ không hợp lệ.'); }
    const danhSach = [...danhSachInput].sort((a, b) => String(a?.maHanhDong || '').localeCompare(String(b?.maHanhDong || '')));
    return giaoDich(async (db) => {
        const ketQua = [];
        for (const input of danhSach) { ketQua.push(await giuHanMucTrongGiaoDich(input, db)); }
        return ketQua;
    }, {
        isolationLevel: ISOLATION_LEVEL.READ_COMMITTED,
        soLanThuLai: 2
    });
}

async function hoanTraHanMucTrongGiaoDich(phieuGiu, db = null) {
    if (!phieuGiu?.theoDoi) { return null; }
    const soLuong = parseSoLuong(phieuGiu.soLuong);
    const chuThe = chuanHoaChuThe(phieuGiu);
    const ketQua = await repository.hoanTraSuDung({
        nguoiDungId: chuThe.nguoiDungId,
        phienKhachId: chuThe.phienKhachId,
        maHanhDong: chuanHoaMaHanhDong(phieuGiu.maHanhDong),
        donVi: phieuGiu.donVi,
        kyBatDau: batBuocDate(phieuGiu.kyBatDau),
        kyKetThuc: batBuocDate(phieuGiu.kyKetThuc),
        soLuong
    }, db);
    if (!ketQua) { return null; }
    return {
        ...ketQua,
        daSuDung: bigIntRaJson(ketQua.daSuDung)
    };
}

async function hoanTraHanMuc(phieuGiu) {
    return hoanTraHanMucTrongGiaoDich(phieuGiu);
}

async function hoanTraNhieuHanMuc(danhSachPhieuGiu) {
    if (!Array.isArray(danhSachPhieuGiu) || danhSachPhieuGiu.length === 0) { return []; }
    const danhSach = [...danhSachPhieuGiu].sort((a, b) => String(a?.maHanhDong || '').localeCompare(String(b?.maHanhDong || '')));
    return giaoDich(async (db) => {
        const ketQua = [];
        for (const phieuGiu of danhSach) { ketQua.push(await hoanTraHanMucTrongGiaoDich(phieuGiu, db)); }
        return ketQua;
    }, {
        isolationLevel: ISOLATION_LEVEL.READ_COMMITTED,
        soLanThuLai: 2
    });
}

function mapNguoiDungTraCuu(context) {
    return {
        id: context.id,
        email: context.email,
        tenDangNhap: context.tenDangNhap,
        hoTen: context.hoTen,
        loaiTaiKhoan: context.loaiTaiKhoan,
        trangThai: context.trangThai
    };
}

function mapDangKyGoiTraCuu(context) {
    if (!context.dangKyGoi) { return null; }
    return {
        id: context.dangKyGoi.id,
        goiDichVuId: context.dangKyGoi.goiDichVuId,
        trangThai: context.dangKyGoi.trangThai,
        nguonKichHoat: context.dangKyGoi.nguonKichHoat,
        batDauLuc: context.dangKyGoi.batDauLuc,
        hetHanLuc: context.dangKyGoi.hetHanLuc,
        tuDongGiaHan: context.dangKyGoi.tuDongGiaHan
    };
}

function mapTinhTrangTraCuu(tinhTrang) {
    const chinhSach = tinhTrang.chinhSach;
    const ky = tinhTrang.ky;
    return {
        maHanhDong: chinhSach.maHanhDong,
        trangThai: 'AP_DUNG',
        nguon: chinhSach.id === null ? 'HE_THONG' : 'CHINH_SACH',
        chinhSachId: chinhSach.id,
        maChinhSach: chinhSach.ma,
        tenChinhSach: chinhSach.ten,
        doiTuong: chinhSach.doiTuong,
        donVi: chinhSach.donVi,
        chuKy: chinhSach.chuKy,
        khongGioiHan: chinhSach.khongGioiHan,
        gioiHan: tinhTrang.gioiHan,
        daSuDung: tinhTrang.daSuDung,
        conLai: tinhTrang.conLai,
        duocPhep: tinhTrang.duocPhep,
        theoDoiSuDung: Boolean(ky?.theoDoi),
        kyBatDau: ky?.kyBatDau || null,
        kyKetThuc: ky?.kyKetThuc || null
    };
}

async function layTinhTrangTraCuu(nguoiDungId, maHanhDong) {
    try {
        const tinhTrang = await layTinhTrang({
            nguoiDungId,
            maHanhDong
        });
        return mapTinhTrangTraCuu(tinhTrang);
    } catch (error) {
        if (error.code !== MA_LOI.CHINH_SACH_HAN_MUC_CHUA_CAU_HINH) { throw error; }
        return {
            maHanhDong: chuanHoaMaHanhDong(maHanhDong),
            trangThai: 'CHUA_CAU_HINH',
            nguon: null,
            chinhSachId: null,
            maChinhSach: null,
            tenChinhSach: null,
            doiTuong: null,
            donVi: null,
            chuKy: null,
            khongGioiHan: false,
            gioiHan: null,
            daSuDung: null,
            conLai: null,
            duocPhep: false,
            theoDoiSuDung: false,
            kyBatDau: null,
            kyKetThuc: null
        };
    }
}

async function getTongQuanNguoiDung(nguoiDungId) {
    const userId = parseId(nguoiDungId, 'ID người dùng');
    const context = await repository.getNguoiDungContext(userId);
    if (!context) { throw taoLoi(404, 'Người dùng không tồn tại.', MA_LOI.NGUOI_DUNG_KHONG_TIM_THAY); }
    if (context.trangThai !== 'HOAT_DONG') { throw taoLoi(403, 'Tài khoản hiện không hoạt động.', MA_LOI.TAI_KHOAN_KHONG_HOAT_DONG); }
    const hanMuc = {};
    for (const maHanhDong of DANH_SACH_MA_HAN_MUC) {
        hanMuc[maHanhDong] = await layTinhTrangTraCuu(userId, maHanhDong);
    }
    return {
        nguoiDung: mapNguoiDungTraCuu(context),
        dangKyGoi: mapDangKyGoiTraCuu(context),
        goiDichVu: context.dangKyGoi?.goiDichVu || null,
        hanMuc
    };
}

async function getChiTietHanMucNguoiDung(nguoiDungId, maHanhDong) {
    const userId = parseId(nguoiDungId, 'ID người dùng');
    const ma = chuanHoaMaHanhDong(maHanhDong);
    const context = await repository.getNguoiDungContext(userId);
    if (!context) { throw taoLoi(404, 'Người dùng không tồn tại.', MA_LOI.NGUOI_DUNG_KHONG_TIM_THAY); }
    if (context.trangThai !== 'HOAT_DONG') { throw taoLoi(403, 'Tài khoản hiện không hoạt động.', MA_LOI.TAI_KHOAN_KHONG_HOAT_DONG); }
    return {
        nguoiDung: mapNguoiDungTraCuu(context),
        dangKyGoi: mapDangKyGoiTraCuu(context),
        goiDichVu: context.dangKyGoi?.goiDichVu || null,
        hanMuc: await layTinhTrangTraCuu(userId, ma)
    };
}

module.exports = {
    resolveChinhSach,
    layTinhTrang,
    kiemTraHanMuc,
    batBuocHanMuc,
    giuHanMuc,
    giuNhieuHanMuc,
    hoanTraHanMuc,
    hoanTraNhieuHanMuc,
    getTongQuanNguoiDung,
    getChiTietHanMucNguoiDung
};