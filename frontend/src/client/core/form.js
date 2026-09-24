'use strict';
const { qa, datBusy, datDisabled, onReady } = require('./dom');

function laySubmitButtons(form) { return qa('button[type="submit"], input[type="submit"]', form); }

function datSubmitting(form, submitting = true) {
    if (!form) { return; }
    datBusy(form, submitting);
    form.classList.toggle('is-submitting', submitting);
    for (const button of laySubmitButtons(form)) { datDisabled(button, submitting); }
}

function khoiPhucForm(form) { datSubmitting(form, false); }

function initRange(form) {
    for (const input of qa('input[type="range"]', form)) {
        const output = form.querySelector(`[data-range-output="${input.id}"]`) || input.parentElement?.querySelector?.('[data-range-output]');
        if (!output) { continue; }
        const capNhat = () => { output.textContent = input.value; };
        input.addEventListener('input', capNhat);
        capNhat();
    }
}

function initPasswordToggle(button) {
    if (!button || button.dataset.passwordToggleInitialized === 'true') { return; }
    const input = document.getElementById(button.dataset.passwordToggle || '');
    if (!input || input.tagName !== 'INPUT') { return; }
    button.dataset.passwordToggleInitialized = 'true';
    button.addEventListener('click', () => {
        const dangHien = input.type === 'text';
        input.type = dangHien ? 'password' : 'text';
        const icon = button.querySelector('[data-password-toggle-icon]');
        if (icon) { icon.src = dangHien ? '/assets/images/icons/eye.svg' : '/assets/images/icons/eye-off.svg'; } else { button.textContent = dangHien ? 'Hiện' : 'Ẩn'; }
        button.title = dangHien ? 'Hiển thị mật khẩu' : 'Ẩn mật khẩu';
        button.setAttribute('aria-pressed', dangHien ? 'false' : 'true');
        button.setAttribute('aria-label', dangHien ? 'Hiển thị mật khẩu' : 'Ẩn mật khẩu');
    });
}

function initForm(form) {
    if (!form || form.dataset.formUiInitialized === 'true') { return; }
    form.dataset.formUiInitialized = 'true';
    initRange(form);
    for (const button of qa('[data-password-toggle]', form)) { initPasswordToggle(button); }
    form.addEventListener('submit', () => { requestAnimationFrame(() => datSubmitting(form, true)); });
}

function initForms(root = document) { for (const form of qa('form', root)) { initForm(form); } }

function init() { onReady(() => { initForms(); window.addEventListener('pageshow', () => { for (const form of qa('form')) { khoiPhucForm(form); } }); }); }

init();

module.exports = {
    laySubmitButtons,
    datSubmitting,
    khoiPhucForm,
    initRange,
    initPasswordToggle,
    initForm,
    initForms,
    init
};