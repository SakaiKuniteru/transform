'use strict';

function chuanHoaThongBao(value, macDinh = 'Dữ liệu không hợp lệ.') {
    if (typeof value !== 'string') { return macDinh; }
    const thongBao = value.trim();
    return thongBao || macDinh;
}

function themLoiTruong(errors, tenTruong, thongBao) {
    if (!tenTruong) { return; }
    if (!errors[tenTruong]) { errors[tenTruong] = []; }
    errors[tenTruong].push(chuanHoaThongBao(thongBao));
}

function chuanHoaErrors(errors = {}) {
    if (!errors || typeof errors !== 'object' || Array.isArray(errors)) { return {}; }
    const ketQua = {};
    for (const [ tenTruong, thongBao ] of Object.entries(errors)) { const danhSach = Array.isArray(thongBao) ? thongBao : [ thongBao ]; for (const item of danhSach) { themLoiTruong(ketQua, tenTruong, item); } }
    return ketQua;
}

class FormError extends Error {
    constructor(message = 'Dữ liệu biểu mẫu không hợp lệ.', options = {}) {
        super(chuanHoaThongBao(message, 'Dữ liệu biểu mẫu không hợp lệ.'), options.cause ? { cause: options.cause } : undefined);
        this.name = 'FormError';
        this.code = options.code || 'FORM_INVALID';
        this.statusCode = Number.isInteger(options.statusCode) ? options.statusCode : 400;
        this.errors = chuanHoaErrors(options.errors);
        this.globalErrors = Array.isArray(options.globalErrors) ? options.globalErrors.map((item) => chuanHoaThongBao(item)).filter(Boolean) : [];
        this.data = options.data ?? null;
    }

    coLoiTruong(tenTruong) { return Boolean(this.errors[tenTruong]?.length); }

    layLoiDauTien(tenTruong) { return this.errors[tenTruong]?.[0] || null; }

    toJSON() { return { name: this.name, message: this.message, code: this.code, statusCode: this.statusCode, errors: this.errors, globalErrors: this.globalErrors, data: this.data }; }

    static tuApiError(error) {
        if (error instanceof FormError) { return error; }
        const errors = {};
        const globalErrors = [];
        if (Array.isArray(error?.details)) { for (const item of error.details) { if (item?.truong) { themLoiTruong(errors, item.truong, item.thongBao || error.message); } else if (item?.thongBao) { globalErrors.push(chuanHoaThongBao(item.thongBao)); } } }
        if (!Object.keys(errors).length && !globalErrors.length && error?.message) { globalErrors.push(chuanHoaThongBao(error.message)); }
        return new FormError(error?.message || 'Dữ liệu biểu mẫu không hợp lệ.', { code: error?.code || 'FORM_API_ERROR', statusCode: error?.statusCode || 400, errors, globalErrors, data: error?.data ?? null, cause: error });
    }
}

function laFormError(error) { return error instanceof FormError; }

module.exports = { 
    FormError, 
    laFormError, 
    chuanHoaErrors 
};