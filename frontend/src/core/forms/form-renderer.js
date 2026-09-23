'use strict';
const formRegistry = require('./form-registry');
const { chuanHoaForm } = require('./form-builder');
const formState = require('./form-state');

function laBangNhau(valueA, valueB) { return String(valueA ?? '') === String(valueB ?? ''); }

function taoOptions(field, value) {
    const selectedValues = new Set((Array.isArray(value) ? value : [ value ]).map((item) => String(item ?? '')));
    return field.options.map((option) => ({ ...option, selected: selectedValues.has(String(option.value ?? '')) }));
}

function taoFieldView(field, state, context = {}) {
    const value = formState.layGiaTri(state, field.name, field.defaultValue ?? '');
    const errors = formState.layLoi(state, field.name);
    const visible = typeof field.visible === 'function' ? field.visible(state.values, context, field) !== false : field.visible !== false;
    const checked = field.type === 'checkbox' || field.type === 'toggle' ? Boolean(value) : field.type === 'radio' ? laBangNhau(value, field.value) : false;
    return { ...field, value, errors, error: errors[0] || null, hasError: errors.length > 0, touched: formState.daCham(state, field.name), visible, checked, options: taoOptions(field, value), partialPath: `forms/${field.partial}`, ariaInvalid: errors.length ? 'true' : 'false', ariaDescribedBy: errors.length ? `${field.id}-error` : null };
}

function layForm(input, context) {
    if (typeof input === 'string') { return formRegistry.layForm(input, context); }
    return chuanHoaForm(input);
}

function renderForm(input, stateInput = {}, context = {}) {
    const form = layForm(input, context);
    const state = formState.taoFormState(stateInput);
    const fields = form.fields.map((field) => taoFieldView(field, state, context)).filter((field) => field.visible);
    return { ...form, fields, state, values: state.values, errors: state.errors, globalErrors: state.globalErrors, hasErrors: Object.keys(state.errors).length > 0 || state.globalErrors.length > 0, csrfToken: context.csrfToken || null, partialPath: 'forms/form' };
}

module.exports = { 
    renderForm, 
    taoFieldView 
};