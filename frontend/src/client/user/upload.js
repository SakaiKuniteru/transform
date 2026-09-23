'use strict';

const { q, qa, onReady, datBusy, datDisabled } = require('../core/dom');

const { layCsrfToken } = require('../core/http');

const { hienToast } = require('../core/toast');

function layUploadElements(form) {
    return {
        progress: q('[data-upload-progress]', form) || q('[data-upload-progress]'),
        progressText: q('[data-upload-progress-text]', form) || q('[data-upload-progress-text]'),
        submitButtons: qa('button[type="submit"], input[type="submit"]', form)
    };
}

function capNhatTienTrinh(elements, percent) {
    const value = Math.min(100, Math.max(0, Math.round(Number(percent) || 0)));
    if (elements.progress) {
        elements.progress.hidden = false;
        elements.progress.value = value;
        elements.progress.setAttribute('aria-valuenow', String(value));
    }
    if (elements.progressText) { elements.progressText.textContent = `${value}%`; }
}

function datTrangThaiUpload(form, elements, busy) {
    datBusy(form, busy);
    form.classList.toggle('is-uploading', busy);
    for (const button of elements.submitButtons) { datDisabled(button, busy); }
}

function layThongBao(responseText) {
    if (!responseText) { return null; }
    try {
        const data = JSON.parse(responseText);
        return data.message || data.error?.message || null;
    } catch (error) { return null; }
}

function upload(form) {
    return new Promise((resolve, reject) => {
        const action = new URL(form.action || window.location.href, window.location.origin);
        if (action.origin !== window.location.origin) {
            reject(new TypeError('Upload chỉ cho phép gửi cùng origin.'));
            return;
        }
        const elements = layUploadElements(form);
        const xhr = new XMLHttpRequest();
        const formData = new FormData(form);
        const csrfToken = layCsrfToken();
        xhr.open(String(form.method || 'POST').toUpperCase(), action.href, true);
        xhr.withCredentials = true;
        xhr.setRequestHeader('Accept', 'text/html,application/json;q=0.9');
        if (csrfToken) { xhr.setRequestHeader('X-CSRF-Token', csrfToken); }
        xhr.upload.addEventListener('progress', (event) => {
            if (!event.lengthComputable) { return; }
            capNhatTienTrinh(elements, (event.loaded / event.total) * 100);
        });
        xhr.addEventListener('load', () => {
            datTrangThaiUpload(form, elements, false);
            if (xhr.status >= 200 && xhr.status < 400) {
                capNhatTienTrinh(elements, 100);
                resolve(xhr);
                return;
            }
            const error = new Error(layThongBao(xhr.responseText) || `Upload thất bại (${xhr.status}).`);
            error.status = xhr.status;
            reject(error);
        });
        xhr.addEventListener('error', () => {
            datTrangThaiUpload(form, elements, false);
            reject(new Error('Không thể kết nối để tải tệp lên.'));
        });
        xhr.addEventListener('abort', () => {
            datTrangThaiUpload(form, elements, false);
            const error = new Error('Upload đã bị hủy.');
            error.name = 'AbortError';
            reject(error);
        });
        datTrangThaiUpload(form, elements, true);
        capNhatTienTrinh(elements, 0);
        xhr.send(formData);
    });
}

function initUploadForm(form) {
    if (!form || form.dataset.uploadInitialized === 'true') { return; }
    form.dataset.uploadInitialized = 'true';
    form.addEventListener('submit', async (event) => {
        if (!window.XMLHttpRequest || !window.FormData) { return; }
        event.preventDefault();
        try {
            const xhr = await upload(form);
            if (xhr.responseURL && new URL(xhr.responseURL, window.location.origin).origin === window.location.origin) {
                window.location.assign(xhr.responseURL);
                return;
            }
            window.location.reload();
        } catch (error) {
            if (error?.name === 'AbortError') { return; }
            hienToast(error?.message || 'Không thể tải tệp lên.', {
                type: 'error'
            });
        }
    });
}

function initUpload(root = document) {
    for (const form of qa('form', root)) {
        if (!form.matches('[data-upload-form], [enctype="multipart/form-data"]') && !q('input[type="file"]', form)) { continue; }
        initUploadForm(form);
    }
}

function init() { onReady(() => initUpload()); }

init();

module.exports = {
    layUploadElements,
    capNhatTienTrinh,
    upload,
    initUploadForm,
    initUpload,
    init
};