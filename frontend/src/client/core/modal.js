'use strict';

const { q, onReady } = require('./dom');

const { delegate, emit } = require('./event');

let modalHienTai = null;
let focusTruocDo = null;

function layModal(target) {
    if (!target) { return null; }
    if (target instanceof Element) { return target.matches('[data-modal], [data-confirm]') ? target : null; }
    const id = String(target).replace(/^#/, '');
    return document.getElementById(id) || q(`[data-modal="${id}"], [data-confirm="${id}"]`);
}

function moModal(target) {
    const modal = layModal(target);
    if (!modal) { return null; }
    if (modalHienTai && modalHienTai !== modal) { dongModal(modalHienTai, { restoreFocus: false }); }
    focusTruocDo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modal.hidden = false;
    modal.classList.add('is-open');
    document.documentElement.classList.add('has-modal-open');
    modalHienTai = modal;
    const focusTarget = q('[autofocus], button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', modal);
    focusTarget?.focus?.();
    emit(modal, 'modal:open');
    return modal;
}

function dongModal(target = modalHienTai, options = {}) {
    const modal = layModal(target);
    if (!modal) { return null; }
    modal.hidden = true;
    modal.classList.remove('is-open');
    emit(modal, 'modal:close');
    if (modal === modalHienTai) {
        modalHienTai = null;
        document.documentElement.classList.remove('has-modal-open');
    }
    if (options.restoreFocus !== false) { focusTruocDo?.focus?.(); }
    return modal;
}

function initModal(root = document) {
    if (root === document && document.documentElement.dataset.modalUiInitialized === 'true') { return; }
    if (root === document) { document.documentElement.dataset.modalUiInitialized = 'true'; }
    delegate(root, 'click', '[data-modal-open], [data-confirm-open]', (event, trigger) => {
        const target = trigger.dataset.modalOpen || trigger.dataset.confirmOpen;
        if (!target) { return; }
        event.preventDefault();
        moModal(target);
    });
    delegate(root, 'click', '[data-modal-close], [data-confirm-cancel]', (event, trigger) => {
        const modal = trigger.closest('[data-modal], [data-confirm]');
        if (!modal) { return; }
        event.preventDefault();
        if (trigger.matches('[data-confirm-cancel]')) { emit(modal, 'confirm:cancel'); }
        dongModal(modal);
    });
    delegate(root, 'click', '[data-modal-action]', (event, trigger) => {
        const modal = trigger.closest('[data-modal]');
        if (!modal) { return; }
        emit(modal, 'modal:action', { action: trigger.dataset.modalAction || null, value: trigger.value || null, trigger });
    });
    delegate(root, 'click', '[data-confirm-ok]', (event, trigger) => {
        const modal = trigger.closest('[data-confirm]');
        if (!modal) { return; }
        event.preventDefault();
        emit(modal, 'confirm:ok', { value: trigger.dataset.confirmValue || null, trigger });
        dongModal(modal);
    });
    root.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || !modalHienTai) { return; }
        const khoaDong = modalHienTai.querySelector('[data-modal-lock-close]') || modalHienTai.dataset.lockClose === 'true';
        if (khoaDong) { return; }
        event.preventDefault();
        dongModal(modalHienTai);
    });
}

function init() { onReady(() => initModal()); }

init();

module.exports = {
    layModal,
    moModal,
    dongModal,
    initModal,
    init
};