'use strict';
const { FormError } = require('./form-error');

function laRong(value) {
    if (value === null || value === undefined || value === '') { return true; }
    if (typeof value === 'string') { return value.trim() === ''; }
    if (Array.isArray(value)) { return value.length === 0; }
    return false;
}

function chuanHoaChuoi(value) { return typeof value === 'string' ? value.trim() : value; }

function layTenHienThi(field) { return field.label || field.name || 'Trường dữ liệu'; }

function taoThongBao(field, rule, macDinh) { return rule?.message || field?.messages?.[rule?.type] || macDinh; }

function taoDanhSachRule(field) {
    const rules = [];
    if (field.required) { rules.push({ type: 'required' }); }
    if (field.minLength !== undefined) { rules.push({ type: 'minLength', value: field.minLength }); }
    if (field.maxLength !== undefined) { rules.push({ type: 'maxLength', value: field.maxLength }); }
    if (field.min !== undefined) { rules.push({ type: 'min', value: field.min }); }
    if (field.max !== undefined) { rules.push({ type: 'max', value: field.max }); }
    if (field.pattern !== undefined) { rules.push({ type: 'pattern', value: field.pattern }); }
    if (field.sameAs) { rules.push({ type: 'sameAs', value: field.sameAs }); }
    if (Array.isArray(field.oneOf)) { rules.push({ type: 'oneOf', value: field.oneOf }); }
    if (field.type === 'email') { rules.push({ type: 'email' }); }
    if (field.type === 'number' || field.type === 'range') { rules.push({ type: 'number' }); }
    if (Array.isArray(field.validators)) { rules.push(...field.validators); }
    if (typeof field.validate === 'function') { rules.push({ type: 'custom', validate: field.validate }); }
    return rules;
}

async function kiemTraRule(rule, value, field, values, context) {
    const ten = layTenHienThi(field);
    switch (rule.type) {
        case 'required': return laRong(value) || value === false ? taoThongBao(field, rule, `${ten} là bắt buộc.`) : null;
        case 'email': return laRong(value) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)) ? null : taoThongBao(field, rule, `${ten} không đúng định dạng email.`);
        case 'minLength': return laRong(value) || String(value).length >= Number(rule.value) ? null : taoThongBao(field, rule, `${ten} phải có ít nhất ${rule.value} ký tự.`);
        case 'maxLength': return laRong(value) || String(value).length <= Number(rule.value) ? null : taoThongBao(field, rule, `${ten} không được vượt quá ${rule.value} ký tự.`);
        case 'min': return laRong(value) || Number(value) >= Number(rule.value) ? null : taoThongBao(field, rule, `${ten} phải lớn hơn hoặc bằng ${rule.value}.`);
        case 'max': return laRong(value) || Number(value) <= Number(rule.value) ? null : taoThongBao(field, rule, `${ten} phải nhỏ hơn hoặc bằng ${rule.value}.`);
        case 'number': return laRong(value) || Number.isFinite(Number(value)) ? null : taoThongBao(field, rule, `${ten} phải là một số hợp lệ.`);
        case 'integer': return laRong(value) || Number.isInteger(Number(value)) ? null : taoThongBao(field, rule, `${ten} phải là số nguyên.`);
        case 'pattern': { const regex = rule.value instanceof RegExp ? rule.value : new RegExp(rule.value); return laRong(value) || regex.test(String(value)) ? null : taoThongBao(field, rule, `${ten} không đúng định dạng.`); }
        case 'sameAs': return value === values[rule.value] ? null : taoThongBao(field, rule, `${ten} không khớp.`);
        case 'oneOf': return laRong(value) || rule.value.includes(value) ? null : taoThongBao(field, rule, `${ten} không có giá trị hợp lệ.`);
        case 'custom': { const validate = rule.validate || rule.validator; if (typeof validate !== 'function') { throw new TypeError(`Validator custom của ${field.name} không hợp lệ.`); } const ketQua = await validate(value, values, context, field); return ketQua === true || ketQua === undefined || ketQua === null ? null : chuanHoaChuoi(ketQua) || taoThongBao(field, rule, `${ten} không hợp lệ.`); }
        default: throw new TypeError(`Validator type không được hỗ trợ: ${rule.type}.`);
    }
}

function chuanHoaGiaTri(field, value) {
    let ketQua = value;
    if (field.trim !== false && typeof ketQua === 'string' && field.type !== 'password') { ketQua = ketQua.trim(); }
    if (field.type === 'checkbox' || field.type === 'toggle') { ketQua = ketQua === true || ketQua === 'true' || ketQua === '1' || ketQua === 'on'; }
    if (typeof field.normalize === 'function') { ketQua = field.normalize(ketQua, field); }
    return ketQua;
}

async function validateField(field, value, values, context = {}) {
    const errors = [];
    for (const rule of taoDanhSachRule(field)) { const error = await kiemTraRule(rule, value, field, values, context); if (error) { errors.push(error); if (field.abortEarly !== false) { break; } } }
    return errors;
}

async function validateForm(form, input = {}, context = {}) {
    if (!form || !Array.isArray(form.fields)) { throw new TypeError('Form không hợp lệ.'); }
    const values = {};
    for (const field of form.fields) {
        const coGiaTri = Object.hasOwn(input, field.name);
        const macDinh = field.type === 'checkbox' || field.type === 'toggle' ? false : field.defaultValue ?? '';
        values[field.name] = chuanHoaGiaTri(field, coGiaTri ? input[field.name] : macDinh);
    }
    const errors = {};
    for (const field of form.fields) { const fieldErrors = await validateField(field, values[field.name], values, context); if (fieldErrors.length) { errors[field.name] = fieldErrors; } }
    const globalErrors = [];
    if (typeof form.validate === 'function') { const ketQua = await form.validate(values, context); if (typeof ketQua === 'string' && ketQua.trim()) { globalErrors.push(ketQua.trim()); } else if (Array.isArray(ketQua)) { globalErrors.push(...ketQua.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim())); } else if (ketQua && typeof ketQua === 'object') { for (const [ tenTruong, thongBao ] of Object.entries(ketQua)) { const danhSach = Array.isArray(thongBao) ? thongBao : [ thongBao ]; errors[tenTruong] = [ ...(errors[tenTruong] || []), ...danhSach.filter(Boolean).map(String) ]; } } }
    return { valid: !Object.keys(errors).length && !globalErrors.length, values, errors, globalErrors };
}

async function batBuocHopLe(form, input = {}, context = {}) {
    const ketQua = await validateForm(form, input, context);
    if (!ketQua.valid) { throw new FormError('Dữ liệu biểu mẫu không hợp lệ.', { errors: ketQua.errors, globalErrors: ketQua.globalErrors, data: ketQua.values }); }
    return ketQua.values;
}

module.exports = { 
    laRong, 
    chuanHoaGiaTri, 
    validateField, 
    validateForm, 
    batBuocHopLe 
};