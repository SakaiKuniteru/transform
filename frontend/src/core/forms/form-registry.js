'use strict';
const { chuanHoaForm } = require('./form-builder');
const registry = new Map();

function chuanHoaTen(name) {
    if (typeof name !== 'string' || !name.trim()) { throw new TypeError('Tên form không hợp lệ.'); }
    return name.trim();
}

function dangKyForm(name, definition, options = {}) {
    const ten = chuanHoaTen(name);
    if (registry.has(ten) && options.override !== true) { throw new Error(`Form đã tồn tại: ${ten}.`); }
    if (typeof definition !== 'function') { definition = chuanHoaForm({ ...definition, id: definition?.id || ten }); }
    registry.set(ten, definition);
    return definition;
}

function coForm(name) {
    if (typeof name !== 'string' || !name.trim()) { return false; }
    return registry.has(name.trim());
}

function layForm(name, context = {}) {
    const ten = chuanHoaTen(name);
    const definition = registry.get(ten);
    if (!definition) { throw new Error(`Chưa đăng ký form: ${ten}.`); }
    const form = typeof definition === 'function' ? definition(context) : definition;
    return chuanHoaForm({ ...form, id: form?.id || ten });
}

function xoaForm(name) { return registry.delete(chuanHoaTen(name)); }

function danhSachForm() { return Array.from(registry.keys()); }

function xoaTatCaForm() { registry.clear(); }

module.exports = { 
    dangKyForm, 
    coForm, 
    layForm, 
    xoaForm, 
    danhSachForm, 
    xoaTatCaForm 
};