'use strict';
const fieldRegistry = require('./field-registry');
const FORM_METHODS = new Set([ 'GET', 'POST', 'PUT', 'PATCH', 'DELETE' ]);
const TEN_PATTERN = /^[A-Za-z][A-Za-z0-9_.\-[\]]*$/;

function chuanHoaId(value, ten = 'ID') {
    if (typeof value !== 'string' || !value.trim()) { throw new TypeError(`${ten} không hợp lệ.`); }
    return value.trim();
}

function chuanHoaMethod(value = 'POST') {
    const method = String(value || 'POST').toUpperCase();
    if (!FORM_METHODS.has(method)) { throw new TypeError(`Form method không hợp lệ: ${method}.`); }
    return method;
}

function chuanHoaOptions(options = []) {
    if (!Array.isArray(options)) { throw new TypeError('Options của field phải là array.'); }
    return options.map((item) => typeof item === 'object' && item !== null ? { value: item.value, label: item.label ?? String(item.value ?? ''), disabled: item.disabled === true } : { value: item, label: String(item), disabled: false });
}

function chuanHoaField(field, formId, index) {
    if (!field || typeof field !== 'object' || Array.isArray(field)) { throw new TypeError(`Field thứ ${index + 1} không hợp lệ.`); }
    const name = chuanHoaId(field.name, 'Tên field');
    if (!TEN_PATTERN.test(name)) { throw new TypeError(`Tên field không hợp lệ: ${name}.`); }
    const type = String(field.type || 'text').toLowerCase();
    const definition = fieldRegistry.layFieldType(type);
    return Object.freeze({ ...field, name, type, id: field.id ? chuanHoaId(field.id, 'Field id') : `${formId}-${name.replace(/[^A-Za-z0-9_-]/g, '-')}`, label: field.label || null, partial: field.partial || definition.partial, inputType: field.inputType || definition.inputType, required: field.required === true, disabled: field.disabled === true, readonly: field.readonly === true, multiple: field.multiple === true, defaultValue: field.defaultValue ?? '', options: chuanHoaOptions(field.options || []), validators: Array.isArray(field.validators) ? [ ...field.validators ] : [], attributes: field.attributes && typeof field.attributes === 'object' && !Array.isArray(field.attributes) ? { ...field.attributes } : {}, messages: field.messages && typeof field.messages === 'object' && !Array.isArray(field.messages) ? { ...field.messages } : {} });
}

function chuanHoaAction(action, index) {
    if (!action || typeof action !== 'object' || Array.isArray(action)) { throw new TypeError(`Action thứ ${index + 1} không hợp lệ.`); }
    return Object.freeze({ type: action.type || 'submit', label: action.label || 'Lưu', name: action.name || null, value: action.value ?? null, className: action.className || null, disabled: action.disabled === true });
}

function chuanHoaForm(definition) {
    if (!definition || typeof definition !== 'object' || Array.isArray(definition)) { throw new TypeError('Định nghĩa form phải là object.'); }
    const id = chuanHoaId(definition.id, 'Form id');
    const method = chuanHoaMethod(definition.method);
    const fields = (definition.fields || []).map((field, index) => chuanHoaField(field, id, index));
    const tenField = new Set();
    for (const field of fields) { if (tenField.has(field.name)) { throw new Error(`Field bị trùng trong form ${id}: ${field.name}.`); } tenField.add(field.name); }
    const coFile = fields.some((field) => field.type === 'file');
    return Object.freeze({ ...definition, id, name: definition.name || id, method, htmlMethod: method === 'GET' || method === 'POST' ? method : 'POST', methodOverride: method === 'GET' || method === 'POST' ? null : method, action: definition.action || '', enctype: definition.enctype || (coFile ? 'multipart/form-data' : 'application/x-www-form-urlencoded'), fields: Object.freeze(fields), actions: Object.freeze((definition.actions || []).map(chuanHoaAction)), validate: typeof definition.validate === 'function' ? definition.validate : null, attributes: definition.attributes && typeof definition.attributes === 'object' && !Array.isArray(definition.attributes) ? { ...definition.attributes } : {} });
}

class FormBuilder {
    constructor(id, options = {}) { this.definition = { ...options, id, fields: [], actions: [] }; }

    field(name, type = 'text', options = {}) { this.definition.fields.push({ ...options, name, type }); return this; }

    action(label, options = {}) { this.definition.actions.push({ ...options, label }); return this; }

    submit(label = 'Lưu', options = {}) { return this.action(label, { ...options, type: 'submit' }); }

    validate(callback) { if (typeof callback !== 'function') { throw new TypeError('Form validator phải là function.'); } this.definition.validate = callback; return this; }

    build() { return chuanHoaForm(this.definition); }
}

function taoForm(id, options = {}) { return new FormBuilder(id, options); }

module.exports = { 
    FormBuilder, 
    taoForm, 
    chuanHoaForm, 
    chuanHoaField 
};