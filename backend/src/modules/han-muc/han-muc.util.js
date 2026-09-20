'use strict';

const {
    CHU_KY_HAN_MUC,
    HANH_DONG_KHI_VUOT
} = require('../../constants/han-muc');

const BAT_DAU_TOAN_THOI_GIAN = new Date('1970-01-01T00:00:00.000Z');
const KET_THUC_TOAN_THOI_GIAN = new Date('9999-12-31T23:59:59.999Z');

const formatterCache = new Map();

function batBuocDate(value, ten = 'Thời gian') {
    const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
    if (Number.isNaN(date.getTime())) { throw new TypeError(`${ten} không hợp lệ.`); }
    return date;
}

function kiemTraMuiGio(muiGio = 'UTC') {
    const value = String(muiGio || 'UTC').trim();
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
    } catch {
        throw new TypeError(`Múi giờ "${value}" không hợp lệ.`);
    }
    return value;
}

function layFormatter(muiGio) {
    const timeZone = kiemTraMuiGio(muiGio);
    if (formatterCache.has(timeZone)) { return formatterCache.get(timeZone); }
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
    });
    formatterCache.set(timeZone, formatter);
    return formatter;
}

function layThanhPhanNgayGio(value, muiGio = 'UTC') {
    const date = batBuocDate(value);
    const parts = layFormatter(muiGio).formatToParts(date);
    const data = {};
    for (const part of parts) {
        if (part.type !== 'literal') { data[part.type] = Number(part.value); }
    }
    return {
        nam: data.year,
        thang: data.month,
        ngay: data.day,
        gio: data.hour,
        phut: data.minute,
        giay: data.second
    };
}

function taoUtcTuNgayGioDiaPhuong({ nam, thang, ngay, gio = 0, phut = 0, giay = 0 }, muiGio = 'UTC') {
    const timeZone = kiemTraMuiGio(muiGio);
    const target = Date.UTC(nam, thang - 1, ngay, gio, phut, giay, 0);
    let timestamp = target;
    for (let i = 0; i < 4; i += 1) {
        const hienTai = layThanhPhanNgayGio(new Date(timestamp), timeZone);
        const hienTaiGiaLapUtc = Date.UTC(hienTai.nam, hienTai.thang - 1, hienTai.ngay, hienTai.gio, hienTai.phut, hienTai.giay, 0);
        const chenhLech = target - hienTaiGiaLapUtc;
        timestamp += chenhLech;
        if (chenhLech === 0) { break; }
    }
    return new Date(timestamp);
}

function congNgayLich({ nam, thang, ngay }, soNgay) {
    const date = new Date(Date.UTC(nam, thang - 1, ngay + soNgay));
    return {
        nam: date.getUTCFullYear(),
        thang: date.getUTCMonth() + 1,
        ngay: date.getUTCDate()
    };
}

function layDauNgay(value, muiGio) {
    const parts = layThanhPhanNgayGio(value, muiGio);
    return taoUtcTuNgayGioDiaPhuong({
        nam: parts.nam,
        thang: parts.thang,
        ngay: parts.ngay
    }, muiGio);
}

function layKyNgay(value, muiGio) {
    const parts = layThanhPhanNgayGio(value, muiGio);
    const ngaySau = congNgayLich(parts, 1);
    return {
        kyBatDau: taoUtcTuNgayGioDiaPhuong(parts, muiGio),
        kyKetThuc: taoUtcTuNgayGioDiaPhuong(ngaySau, muiGio),
        theoDoi: true
    };
}

function layKyTuan(value, muiGio) {
    const parts = layThanhPhanNgayGio(value, muiGio);
    const ngayTrongTuan = new Date(Date.UTC(parts.nam, parts.thang - 1, parts.ngay)).getUTCDay();
    const soNgayLui = ngayTrongTuan === 0 ? 6 : ngayTrongTuan - 1;
    const dauTuan = congNgayLich(parts, -soNgayLui);
    const dauTuanSau = congNgayLich(dauTuan, 7);
    return {
        kyBatDau: taoUtcTuNgayGioDiaPhuong(dauTuan, muiGio),
        kyKetThuc: taoUtcTuNgayGioDiaPhuong(dauTuanSau, muiGio),
        theoDoi: true
    };
}

function layKyThang(value, muiGio) {
    const parts = layThanhPhanNgayGio(value, muiGio);
    const thangSau = new Date(Date.UTC(parts.nam, parts.thang, 1));
    return {
        kyBatDau: taoUtcTuNgayGioDiaPhuong({
            nam: parts.nam,
            thang: parts.thang,
            ngay: 1
        }, muiGio),
        kyKetThuc: taoUtcTuNgayGioDiaPhuong({
            nam: thangSau.getUTCFullYear(),
            thang: thangSau.getUTCMonth() + 1,
            ngay: 1
        }, muiGio),
        theoDoi: true
    };
}

function layKyTheoGoi(dangKyGoi) {
    if (!dangKyGoi?.id) { throw new Error('Không xác định được đăng ký gói để tính kỳ hạn mức.'); }
    if (!dangKyGoi.batDauLuc) { throw new Error('Đăng ký gói chưa có thời gian bắt đầu.'); }
    const kyBatDau = batBuocDate(dangKyGoi.batDauLuc, 'Thời gian bắt đầu gói');
    const kyKetThuc = dangKyGoi.hetHanLuc
        ? batBuocDate(dangKyGoi.hetHanLuc, 'Thời gian hết hạn gói')
        : KET_THUC_TOAN_THOI_GIAN;
    if (kyBatDau >= kyKetThuc) { throw new Error('Khoảng thời gian đăng ký gói không hợp lệ.'); }
    return {
        kyBatDau,
        kyKetThuc,
        theoDoi: true,
        dangKyGoiId: dangKyGoi.id
    };
}

function taoKyHanMuc(chinhSach, context = {}, thoiDiem = new Date()) {
    if (!chinhSach) { throw new TypeError('Chính sách hạn mức không hợp lệ.'); }
    const now = batBuocDate(thoiDiem);
    const muiGio = kiemTraMuiGio(chinhSach.muiGio || 'UTC');
    switch (chinhSach.chuKy) {
        case CHU_KY_HAN_MUC.MOI_REQUEST:
        case CHU_KY_HAN_MUC.MOI_TEP:
            return {
                kyBatDau: null,
                kyKetThuc: null,
                theoDoi: false,
                dangKyGoiId: context.dangKyGoi?.id || null
            };
        case CHU_KY_HAN_MUC.NGAY:
            return layKyNgay(now, muiGio);
        case CHU_KY_HAN_MUC.TUAN:
            return layKyTuan(now, muiGio);
        case CHU_KY_HAN_MUC.THANG:
            return layKyThang(now, muiGio);
        case CHU_KY_HAN_MUC.THEO_GOI:
            return layKyTheoGoi(context.dangKyGoi);
        case CHU_KY_HAN_MUC.TOAN_THOI_GIAN:
            return {
                kyBatDau: new Date(BAT_DAU_TOAN_THOI_GIAN),
                kyKetThuc: new Date(KET_THUC_TOAN_THOI_GIAN),
                theoDoi: true,
                dangKyGoiId: context.dangKyGoi?.id || null
            };
        default:
            throw new Error(`Chu kỳ hạn mức "${chinhSach.chuKy}" chưa được hỗ trợ.`);
    }
}

function chuyenBigInt(value) {
    if (value === null || value === undefined) { return 0n; }
    if (typeof value === 'bigint') { return value; }
    if (typeof value === 'number') {
        if (!Number.isSafeInteger(value)) { throw new TypeError('Giá trị hạn mức vượt phạm vi số nguyên an toàn.'); }
        return BigInt(value);
    }
    if (!/^-?\d+$/.test(String(value))) { throw new TypeError('Giá trị hạn mức không hợp lệ.'); }
    return BigInt(String(value));
}

function bigIntRaJson(value) {
    const number = chuyenBigInt(value);
    if (number <= BigInt(Number.MAX_SAFE_INTEGER) && number >= BigInt(Number.MIN_SAFE_INTEGER)) { return Number(number); }
    return number.toString();
}

function tinhConLai(gioiHan, daSuDung) {
    const limit = chuyenBigInt(gioiHan);
    const used = chuyenBigInt(daSuDung);
    return limit > used ? limit - used : 0n;
}

function taoLoiVuotHanMuc(chinhSach, thongTin = {}) {
    const hanhDong = chinhSach?.hanhDongKhiVuot || HANH_DONG_KHI_VUOT.TU_CHOI;
    let statusCode = 429;
    let message = 'Đã vượt quá hạn mức cho phép.';
    let code = 'VUOT_HAN_MUC';
    if (hanhDong === HANH_DONG_KHI_VUOT.YEU_CAU_DANG_NHAP) {
        statusCode = 401;
        message = 'Vui lòng đăng nhập để tiếp tục.';
        code = 'YEU_CAU_DANG_NHAP';
    }
    if (hanhDong === HANH_DONG_KHI_VUOT.YEU_CAU_NANG_CAP) {
        statusCode = 403;
        message = 'Hạn mức hiện tại không đủ. Vui lòng nâng cấp gói dịch vụ.';
        code = 'YEU_CAU_NANG_CAP';
    }
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    error.data = thongTin;
    return error;
}

module.exports = {
    BAT_DAU_TOAN_THOI_GIAN,
    KET_THUC_TOAN_THOI_GIAN,
    batBuocDate,
    kiemTraMuiGio,
    layThanhPhanNgayGio,
    taoUtcTuNgayGioDiaPhuong,
    layDauNgay,
    taoKyHanMuc,
    chuyenBigInt,
    bigIntRaJson,
    tinhConLai,
    taoLoiVuotHanMuc
};