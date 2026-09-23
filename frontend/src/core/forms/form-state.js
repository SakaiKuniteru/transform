'use strict';
const { chuanHoaErrors } = require('./form-error');

function chuanHoaObject(value) { return value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {}; }

function taoFormState(options = {}) {
    const values = chuanHoaObject(options.values);
    const errors = chuanHoaErrors(options.errors);
    const globalErrors = Array.isArray(options.globalErrors) ? [ ...options.globalErrors ] : [];
    const touched = chuanHoaObject(options.touched);
    return { values, errors, globalErrors, touched, submitted: options.submitted === true, valid: options.valid === true && !Object.keys(errors).length && !globalErrors.length, message: typeof options.message === 'string' ? options.message : null };
}

function layGiaTri(state, tenTruong, macDinh = '') { return state?.values && Object.hasOwn(state.values, tenTruong) ? state.values[tenTruong] : macDinh; }

function layLoi(state, tenTruong) { return state?.errors?.[tenTruong] || []; }

function layLoiDauTien(state, tenTruong) { return layLoi(state, tenTruong)[0] || null; }

function daCham(state, tenTruong) { return state?.touched?.[tenTruong] === true; }

function capNhatGiaTri(state, tenTruong, giaTri) {
    const ketQua = taoFormState(state);
    ketQua.values[tenTruong] = giaTri;
    return ketQua;
}

function ganLoi(state, errors = {}, globalErrors = []) {
    const ketQua = taoFormState(state);
    ketQua.errors = chuanHoaErrors(errors);
    ketQua.globalErrors = Array.isArray(globalErrors) ? [ ...globalErrors ] : [];
    ketQua.valid = !Object.keys(ketQua.errors).length && !ketQua.globalErrors.length;
    return ketQua;
}

function danhDauDaCham(state, ...danhSachTruong) {
    const ketQua = taoFormState(state);
    for (const tenTruong of danhSachTruong.flat(Infinity).filter(Boolean)) { ketQua.touched[tenTruong] = true; }
    return ketQua;
}

function xoaLoi(state, tenTruong = null) {
    const ketQua = taoFormState(state);
    if (tenTruong) { delete ketQua.errors[tenTruong]; } else { ketQua.errors = {}; ketQua.globalErrors = []; }
    ketQua.valid = !Object.keys(ketQua.errors).length && !ketQua.globalErrors.length;
    return ketQua;
}

module.exports = { 
    taoFormState, 
    layGiaTri, 
    layLoi, 
    layLoiDauTien, 
    daCham, 
    capNhatGiaTri, 
    ganLoi, 
    danhDauDaCham, 
    xoaLoi 
};