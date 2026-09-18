'use strict';

const { TRANG_THAI_CONG_VIEC, coTrangThai } = require('../constants/trang-thai-cong-viec');
const { coLoaiChuyenDoi } = require('../constants/loai-chuyen-doi');
const { coDinhDang, chuanHoaDinhDang } = require('../constants/dinh-dang-tep');
const GIOI_HAN_TIEN_TRINH = Object.freeze({ MIN: 0, MAX: 100 });

function chuanHoaTienTrinh(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return 0;
    }

    return Math.min(
        GIOI_HAN_TIEN_TRINH.MAX,
        Math.max(
            GIOI_HAN_TIEN_TRINH.MIN,
            Math.round(number)
        )
    );
}

function taoCongViec(input = {}) {
    return {
        id: input.id ?? null,
        tepNguonId: input.tepNguonId ?? null,
        tepKetQuaId: input.tepKetQuaId ?? null,
        loaiChuyenDoi: input.loaiChuyenDoi ?? null,
        dinhDangNguon: chuanHoaDinhDang(input.dinhDangNguon),
        dinhDangDich: chuanHoaDinhDang(input.dinhDangDich),
        trangThai: input.trangThai || TRANG_THAI_CONG_VIEC.CHO_XU_LY,
        tienTrinh: chuanHoaTienTrinh(input.tienTrinh),
        buocHienTai: input.buocHienTai ?? null,
        thongBao: input.thongBao ?? null,
        maLoi: input.maLoi ?? null,
        chiTietLoi: input.chiTietLoi ?? null,
        tuyChon: input.tuyChon && typeof input.tuyChon === 'object' ? input.tuyChon : {},
        nguoiTaoId: input.nguoiTaoId ?? null,
        queuedAt: input.queuedAt ?? null,
        startedAt: input.startedAt ?? null,
        completedAt: input.completedAt ?? null,
        createdAt: input.createdAt ?? null,
        updatedAt: input.updatedAt ?? null
    };
}

function kiemTraYeuCauTaoCongViec(input) {
    const errors = [];

    if (!input || typeof input !== 'object') {
        return {
            hopLe: false,
            errors: [
                {
                    field: null,
                    code: 'INVALID_OBJECT',
                    message: 'Dữ liệu công việc không hợp lệ.'
                }
            ]
        };
    }

    if (!input.loaiChuyenDoi) {
        errors.push({
            field: 'loaiChuyenDoi',
            code: 'REQUIRED',
            message: 'Loại chuyển đổi là bắt buộc.'
        });
    }
    else if (!coLoaiChuyenDoi(input.loaiChuyenDoi)) {
        errors.push({
            field: 'loaiChuyenDoi',
            code: 'INVALID',
            message: 'Loại chuyển đổi không hợp lệ.'
        });
    }

    if (input.dinhDangNguon && !coDinhDang(input.dinhDangNguon)) {
        errors.push({
            field: 'dinhDangNguon',
            code: 'INVALID',
            message: 'Định dạng nguồn không được hỗ trợ.'
        });
    }

    if (input.dinhDangDich && !coDinhDang(input.dinhDangDich)) {
        errors.push({
            field: 'dinhDangDich',
            code: 'INVALID',
            message: 'Định dạng đích không được hỗ trợ.'
        });
    }

    if (input.trangThai && !coTrangThai(input.trangThai)) {
        errors.push({
            field: 'trangThai',
            code: 'INVALID',
            message: 'Trạng thái công việc không hợp lệ.'
        });
    }

    return {
        hopLe: errors.length === 0,
        errors
    };
}

function taoDuLieuTienTrinh({
    id,
    trangThai,
    tienTrinh,
    buocHienTai = null,
    thongBao = null
}) {
    return {
        id: id ?? null,
        trangThai: trangThai || TRANG_THAI_CONG_VIEC.DANG_XU_LY,
        tienTrinh: chuanHoaTienTrinh(tienTrinh),
        buocHienTai,
        thongBao
    };
}

module.exports = {
    GIOI_HAN_TIEN_TRINH,
    chuanHoaTienTrinh,
    taoCongViec,
    kiemTraYeuCauTaoCongViec,
    taoDuLieuTienTrinh
};