'use strict';
const { onReady, qa, q } = require('../core/dom');
const { layCsrfToken } = require('../core/http');
function thongBao(form, message) { const el = q('[data-public-error]', form); if (el) { el.textContent = message || ''; el.hidden = !message; } }
function initUpload(form) {
    const input = q('[data-public-file-input]', form);
    const choose = q('[data-public-choose]', form);
    const submit = q('[data-public-submit]', form);
    const filename = q('[data-public-filename]', form);
    const drop = q('[data-public-dropzone]', form);
    if (!input || !submit) { return; }
    const selector = q('[data-public-tool-select]', form.parentElement);
    selector?.addEventListener('change', () => { const option = selector.selectedOptions[0]; form.action = `/cong-cu/upload?tool=${encodeURIComponent(selector.value)}`; input.accept = option?.dataset.accept || ''; input.value = ''; if (filename) { filename.textContent = 'Chưa chọn tệp'; } submit.disabled = true; thongBao(form, ''); });
    const capNhat = () => { const file = input.files?.[0]; if (filename) { filename.textContent = file ? file.name : 'Chưa chọn tệp'; } submit.disabled = !file; thongBao(form, ''); };
    choose?.addEventListener('click', () => input.click());
    input.addEventListener('change', capNhat);
    drop?.addEventListener('dragover', (event) => { event.preventDefault(); drop.classList.add('is-dragging'); });
    drop?.addEventListener('dragleave', () => drop.classList.remove('is-dragging'));
    drop?.addEventListener('drop', (event) => { event.preventDefault(); drop.classList.remove('is-dragging'); if (!event.dataTransfer?.files?.length) { return; } const transfer = new DataTransfer(); transfer.items.add(event.dataTransfer.files[0]); input.files = transfer.files; capNhat(); });
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!input.files?.length || submit.disabled) { return; }
        const toolSlug = new URL(form.action, window.location.href).searchParams.get('tool');
        const selectedFile = input.files[0];
        const dinhDang = (selectedFile?.name.split('.').pop() || '').toLowerCase();
        if (!toolSlug || !dinhDang) { thongBao(form, 'Hãy chọn công cụ và tệp hợp lệ.'); return; }
        submit.disabled = true;
        submit.textContent = 'Đang kiểm tra công cụ...';
        try {
            const check = await fetch(`/cong-cu/kha-dung?tool=${encodeURIComponent(toolSlug)}&dinhDang=${encodeURIComponent(dinhDang)}`, { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
            const payload = await check.json();
            if (!check.ok || payload.data?.khaDung !== true) { throw new Error(payload.message || 'Công cụ đang không khả dụng. Kiểm tra Backend và bộ xử lý trước khi upload.'); }
        } catch (error) { thongBao(form, error.message || 'Chưa kiểm tra được công cụ.'); submit.disabled = false; submit.textContent = 'Tải lên và tiếp tục →'; return; }
        submit.textContent = 'Đang tải lên...';
        thongBao(form, '');
        try {
            const headers = { Accept: 'application/json', 'X-CSRF-Token': layCsrfToken() || '' };
            const response = await fetch(form.action, { method: 'POST', headers, credentials: 'same-origin', body: new FormData(form) });
            const payload = await response.json();
            if (!response.ok || payload.success !== true || !payload.data?.redirectUrl) { throw new Error(payload.message || 'Không thể tải tệp lên.'); }
            window.location.assign(payload.data.redirectUrl);
        } catch (error) { thongBao(form, error.message || 'Không thể tải tệp lên.'); submit.disabled = false; submit.textContent = 'Tải lên và tiếp tục →'; }
    });
}
function initJob(root) {
    const url = root.dataset.statusUrl;
    if (!url || root.dataset.refresh !== 'true') { return; }
    let soLan = 0;
    const interval = window.setInterval(async () => {
        if (document.hidden) { return; }
        soLan += 1;
        if (soLan > 180) { window.clearInterval(interval); return; }
        try {
            const response = await fetch(url, { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
            if (!response.ok) { window.clearInterval(interval); return; }
            const result = await response.json();
            const job = result.data;
            if (!result.success || !job) { window.clearInterval(interval); return; }
            const status = q('[data-public-job-status]', root);
            const progress = q('[data-public-job-progress]', root);
            const bar = q('[data-public-job-bar]', root);
            const message = q('[data-public-job-message]', root);
            const actions = q('[data-public-job-actions]', root);
            const percent = Math.max(0, Math.min(100, Number(job.tienTrinh) || 0));
            if (status) { status.textContent = job.trangThai || ''; }
            if (progress) { progress.textContent = `${percent}%`; }
            if (bar) { bar.style.width = `${percent}%`; }
            if (message) { message.textContent = job.thongBao || ''; }
            if (job.tepKetQuaId && actions && !q('[data-public-download]', actions)) { const link = document.createElement('a'); link.className = 'btn btn-primary'; link.dataset.publicDownload = 'true'; link.href = `/cong-cu/tep/${encodeURIComponent(job.tepKetQuaId)}/tai-xuong`; link.textContent = 'Tải tệp kết quả'; actions.prepend(link); }
            if ([ 'HOAN_THANH', 'THAT_BAI', 'DA_HUY', 'HET_HAN' ].includes(job.trangThai)) { window.clearInterval(interval); }
        } catch (error) { window.clearInterval(interval); }
    }, 5000);
}
function initCatalog() {
    const catalog = q('[data-public-catalog]');
    if (!catalog) { return; }
    const search = q('[data-public-tool-search]');
    const groups = qa('[data-public-tool-group]');
    let selected = '';
    function filter() {
        const query = String(search?.value || '').trim().toLocaleLowerCase('vi');
        for (const card of qa('[data-tool-name]', catalog)) {
            const title = card.dataset.toolName.toLocaleLowerCase('vi');
            card.hidden = Boolean((selected && card.dataset.toolGroup !== selected) || (query && !title.includes(query)));
        }
    }
    search?.addEventListener('input', filter);
    for (const button of groups) { button.addEventListener('click', () => { selected = button.dataset.publicToolGroup || ''; for (const current of groups) { current.setAttribute('aria-pressed', current === button ? 'true' : 'false'); } filter(); }); }
}
function init() { onReady(() => { initCatalog(); for (const form of qa('[data-public-upload]')) { initUpload(form); } for (const job of qa('[data-public-job]')) { initJob(job); } }); }
init();
module.exports = {
    initUpload,
    initJob,
    init
};
