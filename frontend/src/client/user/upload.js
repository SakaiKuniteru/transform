'use strict';
const { q, qa, onReady, datBusy, datDisabled } = require('../core/dom');
const { layCsrfToken } = require('../core/http');
const { hienToast } = require('../core/toast');

function dinhDangKichThuoc(bytes) {
    const value = Number(bytes || 0);
    if (!Number.isFinite(value) || value <= 0) { return '0 B'; }
    const units = [ 'B', 'KB', 'MB', 'GB', 'TB' ];
    const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
    const size = value / (1024 ** index);
    return `${size >= 10 || index === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[index]}`;
}

function layUploadElements(form) {
    const workspace = form.closest('[data-upload-workspace]') || form;
    return {
        workspace,
        input: q('[data-upload-input], input[type="file"]', form),
        dropzone: q('[data-upload-dropzone]', workspace),
        browse: q('[data-upload-browse]', workspace),
        files: q('[data-upload-files]', workspace),
        fileList: q('[data-upload-file-list]', workspace),
        fileCount: q('[data-upload-file-count]', workspace),
        fileTemplate: q('[data-upload-file-template]', workspace),
        progressWrap: q('[data-upload-progress-wrap]', workspace),
        progress: q('[data-upload-progress]', workspace),
        progressText: q('[data-upload-progress-text]', workspace),
        submitButtons: qa('button[type="submit"], input[type="submit"]', form)
    };
}

function capNhatDanhSachTep(elements) {
    if (!elements.fileList || !elements.input) { return; }
    const files = Array.from(elements.input.files || []);
    elements.fileList.replaceChildren();
    for (const file of files) {
        const fragment = elements.fileTemplate?.content?.cloneNode(true);
        if (!fragment) { continue; }
        const name = q('[data-upload-file-name]', fragment);
        const size = q('[data-upload-file-size]', fragment);
        if (name) { name.textContent = file.name; }
        if (size) { size.textContent = dinhDangKichThuoc(file.size); }
        elements.fileList.appendChild(fragment);
    }
    if (elements.fileCount) { elements.fileCount.textContent = `${files.length} tệp`; }
    if (elements.files) { elements.files.hidden = files.length === 0; }
}

function capNhatTienTrinh(elements, percent) {
    const value = Math.min(100, Math.max(0, Math.round(Number(percent) || 0)));
    if (elements.progressWrap) { elements.progressWrap.hidden = false; }
    if (elements.progress) { elements.progress.value = value; elements.progress.setAttribute('aria-valuenow', String(value)); }
    if (elements.progressText) { elements.progressText.textContent = `${value}%`; }
}

function datTrangThaiUpload(form, elements, busy) {
    datBusy(form, busy);
    form.classList.toggle('is-uploading', busy);
    for (const button of elements.submitButtons) { datDisabled(button, busy); }
}

function ganTepTha(elements, fileList) {
    if (!elements.input || typeof DataTransfer === 'undefined') { return false; }
    const transfer = new DataTransfer();
    for (const file of Array.from(fileList || [])) { transfer.items.add(file); }
    elements.input.files = transfer.files;
    elements.input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
}

function initDropzone(elements) {
    if (!elements.dropzone || !elements.input) { return; }
    elements.browse?.addEventListener('click', () => elements.input.click());
    elements.dropzone.addEventListener('dragover', (event) => { event.preventDefault(); elements.dropzone.classList.add('is-dragging'); });
    elements.dropzone.addEventListener('dragleave', () => elements.dropzone.classList.remove('is-dragging'));
    elements.dropzone.addEventListener('drop', (event) => { event.preventDefault(); elements.dropzone.classList.remove('is-dragging'); ganTepTha(elements, event.dataTransfer?.files); });
}

function layThongBao(responseText) {
    if (!responseText) { return null; }
    try { const data = JSON.parse(responseText); return data.message || data.error?.message || null; } catch (error) { return null; }
}

function upload(form) {
    return new Promise((resolve, reject) => {
        const action = new URL(form.action || window.location.href, window.location.origin);
        if (action.origin !== window.location.origin) { reject(new TypeError('Upload chỉ cho phép gửi cùng origin.')); return; }
        const elements = layUploadElements(form);
        const xhr = new XMLHttpRequest();
        const formData = new FormData(form);
        const csrfToken = layCsrfToken();
        xhr.open(String(form.method || 'POST').toUpperCase(), action.href, true);
        xhr.withCredentials = true;
        xhr.setRequestHeader('Accept', 'text/html,application/json;q=0.9');
        if (csrfToken) { xhr.setRequestHeader('X-CSRF-Token', csrfToken); }
        xhr.upload.addEventListener('progress', (event) => { if (event.lengthComputable) { capNhatTienTrinh(elements, (event.loaded / event.total) * 100); } });
        xhr.addEventListener('load', () => {
            datTrangThaiUpload(form, elements, false);
            if (xhr.status >= 200 && xhr.status < 400) { capNhatTienTrinh(elements, 100); resolve(xhr); return; }
            const error = new Error(layThongBao(xhr.responseText) || `Upload thất bại (${xhr.status}).`);
            error.status = xhr.status;
            reject(error);
        });
        xhr.addEventListener('error', () => { datTrangThaiUpload(form, elements, false); reject(new Error('Không thể kết nối để tải tệp lên.')); });
        xhr.addEventListener('abort', () => { datTrangThaiUpload(form, elements, false); const error = new Error('Upload đã bị hủy.'); error.name = 'AbortError'; reject(error); });
        datTrangThaiUpload(form, elements, true);
        capNhatTienTrinh(elements, 0);
        xhr.send(formData);
    });
}

function initUploadForm(form) {
    if (!form || form.dataset.uploadInitialized === 'true') { return; }
    form.dataset.uploadInitialized = 'true';
    const elements = layUploadElements(form);
    elements.input?.addEventListener('change', () => capNhatDanhSachTep(elements));
    initDropzone(elements);
    capNhatDanhSachTep(elements);
    form.addEventListener('submit', async (event) => {
        if (!window.XMLHttpRequest || !window.FormData) { return; }
        event.preventDefault();
        try {
            const xhr = await upload(form);
            if (xhr.responseURL && new URL(xhr.responseURL, window.location.origin).origin === window.location.origin) { window.location.assign(xhr.responseURL); return; }
            window.location.reload();
        } catch (error) { if (error?.name !== 'AbortError') { hienToast(error?.message || 'Không thể tải tệp lên.', { type: 'error' }); } }
    });
}

function initUpload(root = document) { for (const form of qa('form[data-upload-form]', root)) { initUploadForm(form); } }

function init() { onReady(() => initUpload()); }

init();

module.exports = {
    dinhDangKichThuoc,
    layUploadElements,
    capNhatDanhSachTep,
    capNhatTienTrinh,
    datTrangThaiUpload,
    ganTepTha,
    initDropzone,
    upload,
    initUploadForm,
    initUpload,
    init
};