'use strict';
const { FIELD_TYPE_CONFIG } = require('./field-types');
const registry = new Map();

function chuanHoaTen(type) {
    if (typeof type !== 'string' || !type.trim()) { throw new TypeError('Tên field type không hợp lệ.'); }
    return type.trim().toLowerCase();
}

function chuanHoaDinhNghia(type, definition = {}) {
    if (!definition || typeof definition !== 'object' || Array.isArray(definition)) { throw new TypeError(`Định nghĩa field type ${type} phải là object.`); }
    if (typeof definition.partial !== 'string' || !definition.partial.trim()) { throw new TypeError(`Field type ${type} phải có partial.`); }
    return Object.freeze({ type, partial: definition.partial.trim(), inputType: definition.inputType || null, normalize: typeof definition.normalize === 'function' ? definition.normalize : null, serialize: typeof definition.serialize === 'function' ? definition.serialize : null });
}

function dangKyFieldType(type, definition, options = {}) {
    const ten = chuanHoaTen(type);
    if (registry.has(ten) && options.override !== true) { throw new Error(`Field type đã tồn tại: ${ten}.`); }
    const daChuanHoa = chuanHoaDinhNghia(ten, definition);
    registry.set(ten, daChuanHoa);
    return daChuanHoa;
}

function layFieldType(type) {
    const ten = chuanHoaTen(type);
    const definition = registry.get(ten);
    if (!definition) { throw new Error(`Chưa đăng ký field type: ${ten}.`); }
    return definition;
}

function coFieldType(type) {
    if (typeof type !== 'string' || !type.trim()) { return false; }
    return registry.has(type.trim().toLowerCase());
}

function xoaFieldType(type) { return registry.delete(chuanHoaTen(type)); }

function danhSachFieldType() { return Array.from(registry.values()); }

function khoiTaoMacDinh() {
    registry.clear();
    for (const [ type, definition ] of Object.entries(FIELD_TYPE_CONFIG)) { dangKyFieldType(type, definition); }
}

khoiTaoMacDinh();
module.exports = { 
    dangKyFieldType, 
    layFieldType, 
    coFieldType, 
    xoaFieldType, 
    danhSachFieldType, 
    khoiTaoMacDinh 
};