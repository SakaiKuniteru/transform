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
        const output = form.querySelector(`[data-range-output="${input.name}"]`) || input.parentElement?.querySelector?.('[data-range-output]');
        if (!output) { continue; }
        const capNhat = () => { output.textContent = input.value; };
        input.addEventListener('input', capNhat);
        capNhat();
    }
}

function initForm(form) {
    if (!form || form.dataset.formUiInitialized === 'true') { return; }
    form.dataset.formUiInitialized = 'true';
    initRange(form);
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
    initForm,
    initForms,
    init
};