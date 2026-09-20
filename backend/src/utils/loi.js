'use strict';

const MA_LOI = require('../constants/ma-loi');

/*
 * ============================================================
 * LỖI ỨNG DỤNG
 * ============================================================
 */

class LoiUngDung extends Error {
    constructor({
        maLoi = MA_LOI.LOI_KHONG_XAC_DINH,
        thongBao = 'Đã xảy ra lỗi.',
        statusCode = 500,
        chiTiet = null,
        metadata = null,
        expose = true,
        cause = null
    } = {}) {
        super(thongBao);
        this.name = 'LoiUngDung';
        this.maLoi = maLoi;
        this.statusCode = statusCode;
        this.chiTiet = chiTiet;
        this.metadata = metadata;
        this.expose = expose;
        if (cause) { this.cause = cause; }
        Error.captureStackTrace?.(this, LoiUngDung);
    }

}

/*
 * ============================================================
 * KIỂM TRA LỖI
 * ============================================================
 */

function laLoiUngDung(error) {
    return error instanceof LoiUngDung;
}

/*
 * ============================================================
 * TẠO LỖI
 * ============================================================
 */

function taoLoi(options = {}) {
    return new LoiUngDung(options);
}

/*
 * ============================================================
 * LỖI 400 - BAD REQUEST
 * ============================================================
 */

function loiYeuCau(thongBao = 'Yêu cầu không hợp lệ.', maLoi = MA_LOI.YEU_CAU_KHONG_HOP_LE, chiTiet = null, metadata = null) {
    return taoLoi({ maLoi, thongBao, statusCode: 400, chiTiet, metadata });
}

/*
 * ============================================================
 * LỖI 401 - UNAUTHORIZED
 * ============================================================
 */

function loiChuaXacThuc(thongBao = 'Bạn chưa được xác thực.', maLoi = MA_LOI.CHUA_XAC_THUC, chiTiet = null) {
    return taoLoi({ maLoi, thongBao, statusCode: 401, chiTiet });
}

/*
 * ============================================================
 * LỖI 403 - FORBIDDEN
 * ============================================================
 */

function loiKhongCoQuyen(thongBao = 'Bạn không có quyền thực hiện thao tác này.', maLoi = MA_LOI.KHONG_CO_QUYEN, chiTiet = null) {
    return taoLoi({ maLoi, thongBao, statusCode: 403, chiTiet });
}

/*
 * ============================================================
 * LỖI 404 - NOT FOUND
 * ============================================================
 */

function loiKhongTimThay(thongBao = 'Không tìm thấy dữ liệu yêu cầu.', maLoi = MA_LOI.KHONG_TIM_THAY, chiTiet = null) {
    return taoLoi({ maLoi, thongBao, statusCode: 404, chiTiet });
}

/*
 * ============================================================
 * LỖI 409 - CONFLICT
 * ============================================================
 */

function loiXungDot(thongBao = 'Dữ liệu đang xảy ra xung đột.', maLoi = MA_LOI.XUNG_DOT_DU_LIEU, chiTiet = null) {
    return taoLoi({ maLoi, thongBao, statusCode: 409, chiTiet });
}

/*
 * ============================================================
 * LỖI 413 - PAYLOAD TOO LARGE
 * ============================================================
 */

function loiQuaLon(thongBao = 'Dữ liệu tải lên vượt quá giới hạn cho phép.', maLoi = MA_LOI.VUOT_GIOI_HAN, chiTiet = null) {
    return taoLoi({ maLoi, thongBao, statusCode: 413, chiTiet });
}

/*
 * ============================================================
 * LỖI 415 - UNSUPPORTED MEDIA TYPE
 * ============================================================
 */

function loiKhongHoTro(thongBao = 'Định dạng dữ liệu không được hỗ trợ.', maLoi = MA_LOI.KHONG_DUOC_HO_TRO, chiTiet = null) {
    return taoLoi({ maLoi, thongBao, statusCode: 415, chiTiet });
}

/*
 * ============================================================
 * LỖI 422 - UNPROCESSABLE ENTITY
 * ============================================================
 */

function loiKhongTheXuLy(thongBao = 'Không thể xử lý dữ liệu yêu cầu.', maLoi = MA_LOI.DU_LIEU_KHONG_HOP_LE, chiTiet = null) {
    return taoLoi({ maLoi, thongBao, statusCode: 422, chiTiet });
}

/*
 * ============================================================
 * LỖI 429 - TOO MANY REQUESTS
 * ============================================================
 */

function loiQuaNhieuYeuCau(thongBao = 'Bạn đã gửi quá nhiều yêu cầu.', maLoi = MA_LOI.QUA_NHIEU_YEU_CAU, chiTiet = null, metadata = null) {
    return taoLoi({ maLoi, thongBao, statusCode: 429, chiTiet, metadata });
}

/*
 * ============================================================
 * LỖI 500 - INTERNAL SERVER ERROR
 * ============================================================
 */

function loiHeThong(thongBao = 'Hệ thống đang xảy ra lỗi.', maLoi = MA_LOI.LOI_HE_THONG, cause = null, metadata = null) {
    return taoLoi({ maLoi, thongBao, statusCode: 500, metadata, expose: false, cause });
}

/*
 * ============================================================
 * LỖI 503 - SERVICE UNAVAILABLE
 * ============================================================
 */

function loiDichVuKhongKhaDung(thongBao = 'Dịch vụ hiện không khả dụng.', maLoi = MA_LOI.DICH_VU_NGOAI_KHONG_KHA_DUNG, cause = null, metadata = null) {
    return taoLoi({ maLoi, thongBao, statusCode: 503, metadata, expose: false, cause });
}

function taoLoiTheoStatus(statusCode, thongBao, maLoi = MA_LOI.LOI_KHONG_XAC_DINH, chiTiet = null, metadata = null) {
    const status = Number(statusCode);
    if (!Number.isInteger(status) || status < 400 || status > 599) { throw new TypeError('Status code lỗi không hợp lệ.'); }
    return taoLoi({
        maLoi,
        thongBao,
        statusCode: status,
        chiTiet,
        metadata,
        expose: status < 500
    });
}

/*
 * ============================================================
 * CHUẨN HÓA JOI
 * ============================================================
 */

function chuanHoaLoiJoi(error) {
    if (!error?.isJoi) { return null; }
    const chiTiet = Array.isArray(error.details)
        ? error.details.map((item) => ({
            truong: Array.isArray(item.path) ? item.path.join('.') : null,
            loai: item.type || null,
            thongBao: item.message
        }))
        : null;
    return loiYeuCau('Dữ liệu gửi lên không hợp lệ.', MA_LOI.DU_LIEU_KHONG_HOP_LE, chiTiet);
}

/*
 * ============================================================
 * CHUẨN HÓA JWT
 * ============================================================
 */

function chuanHoaLoiJwt(error) {
    if (!error?.name) { return null; }
    if (error.name === 'TokenExpiredError') { return loiChuaXacThuc('Token đã hết hạn.', MA_LOI.TOKEN_HET_HAN); }
    if (error.name === 'NotBeforeError') { return loiChuaXacThuc('Token chưa có hiệu lực.', MA_LOI.TOKEN_CHUA_CO_HIEU_LUC); }
    if (error.name === 'JsonWebTokenError') { return loiChuaXacThuc('Token không hợp lệ.', MA_LOI.TOKEN_KHONG_HOP_LE); }
    return null;
}

/*
 * ============================================================
 * CHUẨN HÓA UPLOAD
 * ============================================================
 */

function chuanHoaLoiUpload(error) {
    if (!error?.code) { return null; }
    switch (error.code) {
        case 'LIMIT_FILE_SIZE': return loiQuaLon('Tệp tải lên vượt quá dung lượng cho phép.', MA_LOI.TEP_VUOT_KICH_THUOC);
        case 'LIMIT_FILE_COUNT': return loiQuaLon('Số lượng tệp tải lên vượt quá giới hạn cho phép.', MA_LOI.UPLOAD_VUOT_SO_TEP);
        case 'LIMIT_FIELD_COUNT': return loiYeuCau('Số lượng trường dữ liệu vượt quá giới hạn cho phép.', MA_LOI.UPLOAD_VUOT_SO_TRUONG);
        case 'LIMIT_FIELD_VALUE': return loiQuaLon('Dữ liệu của trường tải lên vượt quá giới hạn cho phép.', MA_LOI.UPLOAD_TRUONG_QUA_LON);
        case 'LIMIT_FIELD_KEY': return loiYeuCau('Tên trường tải lên vượt quá giới hạn cho phép.', MA_LOI.UPLOAD_TRUONG_KHONG_HOP_LE);
        case 'LIMIT_PART_COUNT': return loiQuaLon('Số phần multipart vượt quá giới hạn cho phép.', MA_LOI.UPLOAD_VUOT_SO_PHAN);
        case 'LIMIT_UNEXPECTED_FILE': return loiYeuCau('Trường tệp tải lên không hợp lệ.', MA_LOI.UPLOAD_TRUONG_KHONG_HOP_LE);
        default: return null;
    }
}

/*
 * ============================================================
 * CHI TIẾT DATABASE AN TOÀN
 * ============================================================
 */

function layChiTietDatabase(error) {
    if (!error) { return null; }
    const chiTiet = {};
    if (error.table) { chiTiet.bang = error.table; }
    if (error.column) { chiTiet.cot = error.column; }
    if (error.constraint) { chiTiet.rangBuoc = error.constraint; }
    return Object.keys(chiTiet).length ? chiTiet : null;
}

/*
 * ============================================================
 * CHUẨN HÓA POSTGRESQL
 * ============================================================
 */

function chuanHoaLoiPostgres(error) {
    if (!error?.code || typeof error.code !== 'string') { return null; }
    const chiTiet = layChiTietDatabase(error);
    switch (error.code) {
        case '23505': return loiXungDot('Dữ liệu đã tồn tại.', MA_LOI.DATABASE_DU_LIEU_TRUNG, chiTiet);
        case '23503': return loiXungDot('Dữ liệu đang tham chiếu đến bản ghi không hợp lệ hoặc đang được sử dụng.', MA_LOI.DATABASE_KHOA_NGOAI_KHONG_HOP_LE, chiTiet);
        case '23502': return loiYeuCau('Thiếu dữ liệu bắt buộc.', MA_LOI.DATABASE_THIEU_DU_LIEU, chiTiet);
        case '23514': return loiYeuCau('Dữ liệu không thỏa mãn điều kiện hệ thống.', MA_LOI.DATABASE_DU_LIEU_KHONG_HOP_LE, chiTiet);
        case '22P02': return loiYeuCau('Dữ liệu có kiểu hoặc định dạng không hợp lệ.', MA_LOI.DATABASE_DU_LIEU_KHONG_HOP_LE, chiTiet);
        case '40001': return loiDichVuKhongKhaDung('Giao dịch database đang xảy ra xung đột. Vui lòng thử lại.', MA_LOI.DATABASE_GIAO_DICH_XUNG_DOT, error);
        case '40P01': return loiDichVuKhongKhaDung('Database đang xảy ra deadlock. Vui lòng thử lại.', MA_LOI.DATABASE_DEADLOCK, error);
        case '57014': return loiDichVuKhongKhaDung('Truy vấn database đã vượt quá thời gian cho phép.', MA_LOI.DATABASE_TIMEOUT, error);
        default: if (error.code.startsWith('08')) {return loiDichVuKhongKhaDung('Không thể kết nối tới database.', MA_LOI.DATABASE_KHONG_KHA_DUNG, error); }
        return null;
    }
}

/*
 * ============================================================
 * CHUẨN HÓA LỖI
 * ============================================================
 */

function chuanHoaLoi(error) {
    if (laLoiUngDung(error)) { return error; }
    const loiJoi = chuanHoaLoiJoi(error);
    if (loiJoi) { return loiJoi; }
    const loiJwt = chuanHoaLoiJwt(error);
    if (loiJwt) { return loiJwt; }
    const loiUpload = chuanHoaLoiUpload(error);
    if (loiUpload) { return loiUpload; }
    const loiPostgres = chuanHoaLoiPostgres(error);
    if (loiPostgres) { return loiPostgres; }
    return loiHeThong('Hệ thống đang xảy ra lỗi.', MA_LOI.LOI_HE_THONG, error);
}

module.exports = {
    LoiUngDung,
    laLoiUngDung,
    taoLoi,
    loiYeuCau,
    loiChuaXacThuc,
    loiKhongCoQuyen,
    loiKhongTimThay,
    loiXungDot,
    loiQuaLon,
    loiKhongHoTro,
    loiKhongTheXuLy,
    loiQuaNhieuYeuCau,
    loiHeThong,
    loiDichVuKhongKhaDung,
    taoLoiTheoStatus,
    chuanHoaLoiJoi,
    chuanHoaLoiJwt,
    chuanHoaLoiUpload,
    chuanHoaLoiPostgres,
    chuanHoaLoi
};