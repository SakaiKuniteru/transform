'use strict';

function taoThanhCong(data = null, options = {}) {
    const { message = 'Thành công', meta = null } = options;

    return {
        success: true,
        message,
        data,
        meta,
        error: null
    };
}

function taoThatBai(options = {}) {
    const {
        message = 'Có lỗi xảy ra',
        code = 'UNKNOWN_ERROR',
        details = null,
        data = null
    } = options;

    return {
        success: false,
        message,
        data,
        meta: null,
        error: {
            code,
            details
        }
    };
}

function taoPhanTrang({ page, pageSize, total }) {
    const trang = Math.max(1, Number(page) || 1);
    const kichThuoc = Math.max(1, Number(pageSize) || 20);
    const tong = Math.max(0, Number(total) || 0);
    const totalPages = tong === 0 ? 0 : Math.ceil(tong / kichThuoc);

    return {
        page: trang,
        pageSize: kichThuoc,
        total: tong,
        totalPages,
        hasPrevious: trang > 1,
        hasNext: totalPages > 0 && trang < totalPages
    };
}

function laApiResponse(value) {
    return Boolean(value && typeof value === 'object' && typeof value.success === 'boolean');
}

function laThanhCong(value) {
    return Boolean(laApiResponse(value) && value.success === true);
}

function laThatBai(value) {
    return Boolean(laApiResponse(value) && value.success === false);
}

module.exports = {
    taoThanhCong,
    taoThatBai,
    taoPhanTrang,
    laApiResponse,
    laThanhCong,
    laThatBai
};