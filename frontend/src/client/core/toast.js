'use strict';

const { q, qa, onReady, taoElement } = require('./dom');

const { delegate } = require('./event');

const timers = new WeakMap();

function dongToast(toast) {
    if (!toast) { return; }
    const timer = timers.get(toast);
    if (timer) {
        clearTimeout(timer);
        timers.delete(toast);
    }
    toast.classList.add('is-closing');
    const xoa = () => toast.remove();
    toast.addEventListener('transitionend', xoa, { once: true });
    setTimeout(xoa, 300);
}

function henDongToast(toast) {
    if (!toast || toast.dataset.toastPersistent === 'true' || !toast.querySelector('[data-toast-close]')) { return; }
    const duration = Number(toast.dataset.toastDuration || 5000);
    if (!Number.isFinite(duration) || duration <= 0) { return; }
    const timer = setTimeout(() => dongToast(toast), duration);
    timers.set(toast, timer);
}

function initToast(toast) {
    if (!toast || toast.dataset.toastInitialized === 'true') { return; }
    toast.dataset.toastInitialized = 'true';
    henDongToast(toast);
    toast.addEventListener('mouseenter', () => {
        const timer = timers.get(toast);
        if (timer) {
            clearTimeout(timer);
            timers.delete(toast);
        }
    });
    toast.addEventListener('mouseleave', () => henDongToast(toast));
}

function layContainer() { return q('[data-toast-container]'); }

function hienToast(message, options = {}) {
    const container = layContainer();
    if (!container || !message) { return null; }
    const toast = taoElement('div', { className: `toast toast--${options.type || 'info'}`, role: 'status', dataset: { toast: '', toastType: options.type || 'info', toastDuration: Number.isFinite(options.duration) ? options.duration : 5000, toastPersistent: options.persistent === true ? 'true' : 'false' } });
    const content = taoElement('div', {
        className: 'toast__content'
    });
    if (options.title) { content.appendChild(taoElement('div', { className: 'toast__title' }, options.title)); }
    content.appendChild(taoElement('div', { className: 'toast__message' }, message));
    toast.appendChild(content);
    if (options.persistent !== true) { toast.appendChild(taoElement('button', { type: 'button', className: 'toast__close', 'data-toast-close': '', 'aria-label': 'Đóng thông báo' }, '×')); }
    container.appendChild(toast);
    initToast(toast);
    return toast;
}

function initToastContainer(root = document) {
    for (const toast of qa('[data-toast]', root)) { initToast(toast); }
    delegate(root, 'click', '[data-toast-close]', (event, button) => {
        event.preventDefault();
        dongToast(button.closest('[data-toast]'));
    });
}

function init() { onReady(() => initToastContainer()); }

init();

module.exports = {
    dongToast,
    henDongToast,
    initToast,
    layContainer,
    hienToast,
    initToastContainer,
    init
};