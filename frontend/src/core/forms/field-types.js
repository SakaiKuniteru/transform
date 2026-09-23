'use strict';
const FIELD_TYPES = Object.freeze({ TEXT: 'text', EMAIL: 'email', PASSWORD: 'password', NUMBER: 'number', TEXTAREA: 'textarea', SELECT: 'select', CHECKBOX: 'checkbox', RADIO: 'radio', FILE: 'file', RANGE: 'range', TOGGLE: 'toggle', OTP: 'otp', HIDDEN: 'hidden', SEARCH: 'search', TEL: 'tel', URL: 'url', DATE: 'date', TIME: 'time', DATETIME_LOCAL: 'datetime-local' });
const FIELD_TYPE_CONFIG = Object.freeze({
    text: Object.freeze({ partial: 'input', inputType: 'text' }),
    email: Object.freeze({ partial: 'input', inputType: 'email' }),
    password: Object.freeze({ partial: 'password', inputType: 'password' }),
    number: Object.freeze({ partial: 'number', inputType: 'number' }),
    textarea: Object.freeze({ partial: 'textarea', inputType: null }),
    select: Object.freeze({ partial: 'select', inputType: null }),
    checkbox: Object.freeze({ partial: 'checkbox', inputType: 'checkbox' }),
    radio: Object.freeze({ partial: 'radio', inputType: 'radio' }),
    file: Object.freeze({ partial: 'file', inputType: 'file' }),
    range: Object.freeze({ partial: 'range', inputType: 'range' }),
    toggle: Object.freeze({ partial: 'toggle', inputType: 'checkbox' }),
    otp: Object.freeze({ partial: 'otp', inputType: 'text' }),
    hidden: Object.freeze({ partial: 'input', inputType: 'hidden' }),
    search: Object.freeze({ partial: 'input', inputType: 'search' }),
    tel: Object.freeze({ partial: 'input', inputType: 'tel' }),
    url: Object.freeze({ partial: 'input', inputType: 'url' }),
    date: Object.freeze({ partial: 'input', inputType: 'date' }),
    time: Object.freeze({ partial: 'input', inputType: 'time' }),
    'datetime-local': Object.freeze({ partial: 'input', inputType: 'datetime-local' })
});
const DANH_SACH_FIELD_TYPE = Object.freeze(Object.values(FIELD_TYPES));

function laFieldTypeHopLe(type) { return typeof type === 'string' && Object.hasOwn(FIELD_TYPE_CONFIG, type); }

function layFieldTypeConfig(type) {
    if (!laFieldTypeHopLe(type)) { throw new TypeError(`Field type không hợp lệ: ${type}.`); }
    return FIELD_TYPE_CONFIG[type];
}

module.exports = { 
    FIELD_TYPES, 
    FIELD_TYPE_CONFIG, 
    DANH_SACH_FIELD_TYPE, 
    laFieldTypeHopLe, 
    layFieldTypeConfig 
};