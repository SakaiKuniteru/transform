'use strict';
const { onReady, qa } = require('./dom');
const initialized = new WeakSet();
function parseVi(value) {
    const text = String(value ?? '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    if (!/^-?\d*(?:\.\d*)?$/.test(text) || !/\d/.test(text)) { return null; }
    const result = Number(text);
    return Number.isFinite(result) ? result : null;
}
function formatVi(raw, decimals = 3) {
    const stripped = String(raw || '').replace(/[^\d,\-]/g, '').replace(/(?!^)-/g, '');
    if (!/\d/.test(stripped)) { return stripped.startsWith('-') ? '-' : ''; }
    const neg = stripped.startsWith('-');
    const unsigned = stripped.replace(/-/g, '');
    const comma = unsigned.indexOf(',');
    const integer = (comma < 0 ? unsigned : unsigned.slice(0, comma)).replace(/^0+(?=\d)/, '') || '0';
    const fraction = comma < 0 ? '' : unsigned.slice(comma + 1).replace(/,/g, '').slice(0, decimals);
    const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${neg ? '-' : ''}${grouped}${comma >= 0 && decimals > 0 ? `,${fraction}` : ''}`;
}
function validKind(value, kind) {
    if (!Number.isFinite(value)) { return false; }
    if (kind === 'nonnegative' && value < 0) { return false; }
    if (kind === 'nonpositive' && value > 0) { return false; }
    if (kind === 'integer' && !Number.isInteger(value)) { return false; }
    if (kind === 'positive-integer' && (!Number.isInteger(value) || value <= 0)) { return false; }
    if (kind === 'negative-integer' && (!Number.isInteger(value) || value >= 0)) { return false; }
    return true;
}
function enhanceNumber(original) {
    if (initialized.has(original) || original.dataset.numberNative === 'true') { return; }
    initialized.add(original);
    const kind = original.dataset.numberKind || 'any';
    const integer = ['integer', 'positive-integer', 'negative-integer'].includes(kind) || original.step === '1';
    const decimals = integer ? 0 : Math.min(6, Math.max(0, Number(original.dataset.decimals ?? 3) || 0));
    if (!integer && (!original.hasAttribute('step') || original.getAttribute('step') === '')) { original.step = 'any'; }
    const display = document.createElement('input');
    display.type = 'text';
    display.inputMode = integer ? 'numeric' : 'decimal';
    display.className = original.className;
    display.classList.add('tf-number__display');
    display.placeholder = original.placeholder;
    display.autocomplete = 'off';
    display.disabled = original.disabled;
    display.readOnly = original.readOnly;
    display.setAttribute('aria-label', original.getAttribute('aria-label') || original.getAttribute('aria-labelledby') || 'Nhập số');
    display.value = original.value === '' ? '' : formatVi(String(original.value).replace('.', ','), decimals);
    original.insertAdjacentElement('beforebegin', display);
    original.classList.add('tf-number__native');
    original.tabIndex = -1;
    function sync() {
        if (display.value.trim() === '') { original.value = ''; display.setCustomValidity(original.required ? 'Vui lòng nhập số.' : ''); return; }
        const number = parseVi(display.value);
        if (number === null || !validKind(number, kind) || (original.min !== '' && number < Number(original.min)) || (original.max !== '' && number > Number(original.max))) {
            original.value = '';
            display.setCustomValidity('Giá trị không đúng điều kiện của trường này.');
            return;
        }
        original.value = String(number);
        display.setCustomValidity('');
    }
    display.addEventListener('input', () => {
        const before = display.value.slice(0, display.selectionStart || 0).replace(/\D/g, '').length;
        const formatted = formatVi(display.value, decimals);
        display.value = formatted === '0' && !/\d/.test(display.value) ? '' : formatted;
        let position = 0; let seen = 0;
        while (position < formatted.length && seen < before) { if (/\d/.test(formatted[position])) { seen += 1; } position += 1; }
        display.setSelectionRange(position, position);
        sync();
    });
    display.addEventListener('blur', () => { sync(); if (display.value && display.validity.valid) { display.value = formatVi(String(original.value).replace('.', ','), decimals); } });
    display.addEventListener('invalid', () => { display.classList.add('is-invalid'); });
    display.closest('form')?.addEventListener('submit', (event) => {
        sync();
        if (!display.checkValidity()) { event.preventDefault(); display.reportValidity(); display.focus(); }
    }, true);
    original.addEventListener('change', () => { display.value = original.value === '' ? '' : formatVi(String(original.value).replace('.', ','), decimals); display.setCustomValidity(''); });
}
function initNumbers(root = document) { for (const input of qa('input[type="number"].form-control', root)) { enhanceNumber(input); } }
onReady(() => initNumbers());
module.exports = { parseVi, formatVi, validKind, enhanceNumber, initNumbers };
