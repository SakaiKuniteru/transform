'use strict';
const { onReady, qa } = require('./dom');
const initialized = new WeakSet();
function parseDate(value) {
    const raw = String(value || '').trim();
    const vn = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}:\d{2}(?::\d{2})?))?$/.exec(raw);
    if (vn) { return { date: `${vn[3]}-${vn[2]}-${vn[1]}`, time: vn[4] || '00:00:00' }; }
    const iso = /^(\d{4}-\d{2}-\d{2})(?:T|\s)?(\d{2}:\d{2}(?::\d{2})?)?$/.exec(raw);
    if (iso) { return { date: iso[1], time: iso[2] || '00:00:00' }; }
    if (/^\d{2}:\d{2}(?::\d{2})?$/.test(raw)) { return { date: '', time: raw }; }
    return { date: '', time: '00:00:00' };
}
function normalizedTime(value) {
    const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(value || ''));
    if (!match || Number(match[1]) > 23 || Number(match[2]) > 59 || Number(match[3] || 0) > 59) { return null; }
    return `${match[1]}:${match[2]}:${match[3] || '00'}`;
}
function validDate(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) { return false; }
    const [y, m, d] = iso.split('-').map(Number);
    const candidate = new Date(Date.UTC(y, m - 1, d));
    return candidate.getUTCFullYear() === y && candidate.getUTCMonth() === m - 1 && candidate.getUTCDate() === d;
}
function enhanceDate(original) {
    if (initialized.has(original) || original.dataset.dateNative === 'true') { return; }
    initialized.add(original);
    if ((original.type === 'datetime-local' || original.type === 'time') && !original.hasAttribute('step')) { original.step = '1'; }
    const mode = original.dataset.dateFormat || (original.type === 'time' ? 'HH:mm:ss' : original.type === 'datetime-local' ? 'dd/MM/yyyy HH:mm:ss' : 'dd/MM/yyyy');
    const hasDate = mode.includes('dd/MM/yyyy');
    const hasTime = mode.includes('HH:mm:ss');
    const fixed = original.dataset.fixedTime ? normalizedTime(original.dataset.fixedTime) : null;
    const submitDisplay = original.dataset.returnFormat === 'display';
    const sourceName = original.name;
    let displaySubmit = null;
    if (submitDisplay && sourceName) {
        displaySubmit = document.createElement('input');
        displaySubmit.type = 'hidden';
        displaySubmit.name = sourceName;
        original.removeAttribute('name');
        original.insertAdjacentElement('afterend', displaySubmit);
    }
    const root = document.createElement('div');
    root.className = 'tf-date';
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = `tf-date__trigger ${original.className}`;
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');
    const label = document.createElement('span');
    label.className = 'tf-date__label';
    const calendar = document.createElement('span');
    calendar.textContent = hasDate ? '▦' : '◷';
    calendar.setAttribute('aria-hidden', 'true');
    trigger.append(label, calendar);
    const popup = document.createElement('div');
    popup.className = 'tf-date__popup';
    popup.hidden = true;
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-label', 'Chọn ngày giờ');
    const date = hasDate ? document.createElement('input') : null;
    if (date) { date.type = 'date'; date.className = 'form-control'; if (original.min?.includes('-')) { date.min = original.min.slice(0, 10); } if (original.max?.includes('-')) { date.max = original.max.slice(0, 10); } }
    const time = hasTime && !fixed ? document.createElement('input') : null;
    if (time) { time.type = 'time'; time.step = '1'; time.className = 'form-control'; }
    const actions = document.createElement('div');
    actions.className = 'tf-date__actions';
    function addAction(text, callback, secondary = false) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = secondary ? 'btn btn-secondary' : 'btn btn-primary';
        button.textContent = text;
        button.addEventListener('click', callback);
        actions.append(button);
    }
    if (date) { const group = document.createElement('label'); group.textContent = 'Ngày'; group.append(date); popup.append(group); }
    if (time) { const group = document.createElement('label'); group.textContent = 'Giờ'; group.append(time); popup.append(group); }
    if (hasTime && !fixed) {
        const quick = document.createElement('div');
        quick.className = 'tf-date__quick';
        for (const val of ['00:00:00', '23:59:59']) { const button = document.createElement('button'); button.type = 'button'; button.textContent = val; button.addEventListener('click', () => { time.value = val; }); quick.append(button); }
        popup.append(quick);
    }
    function displayValue() {
        const parsed = parseDate(original.value);
        const d = date?.value || parsed.date;
        const t = fixed || normalizedTime(time?.value || parsed.time) || '00:00:00';
        const viDate = validDate(d) ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '';
        if (hasDate && hasTime) { return viDate ? `${viDate} ${t}` : ''; }
        return hasDate ? viDate : t;
    }
    function syncLabel() {
        const text = displayValue();
        label.textContent = original.value ? text : original.placeholder || mode;
        trigger.classList.toggle('is-placeholder', !original.value);
        if (displaySubmit) { displaySubmit.value = original.value ? text : ''; }
    }
    function close() { popup.hidden = true; trigger.setAttribute('aria-expanded', 'false'); root.classList.remove('is-open'); }
    function open() {
        if (original.disabled || original.readOnly) { return; }
        const parsed = parseDate(original.value);
        if (date) { date.value = parsed.date; }
        if (time) { time.value = normalizedTime(parsed.time) || '00:00:00'; }
        popup.hidden = false; trigger.setAttribute('aria-expanded', 'true'); root.classList.add('is-open');
        (date || time)?.focus();
    }
    function commit() {
        const d = date?.value || '';
        const t = fixed || normalizedTime(time?.value) || (hasTime ? '00:00:00' : '');
        if (hasDate && !validDate(d)) { date?.focus(); return; }
        if (hasTime && !normalizedTime(t)) { time?.focus(); return; }
        const normalized = hasDate ? hasTime ? `${d}T${t}` : d : t;
        original.value = original.type === 'date' ? d : original.type === 'time' ? t : normalized;
        if (displaySubmit) { displaySubmit.value = hasDate ? hasTime ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)} ${t}` : `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : t; }
        original.dispatchEvent(new Event('change', { bubbles: true }));
        syncLabel(); close(); trigger.focus();
    }
    addAction('Xóa', () => { original.value = ''; original.dispatchEvent(new Event('change', { bubbles: true })); syncLabel(); close(); }, true);
    addAction('Áp dụng', commit);
    popup.append(actions);
    trigger.addEventListener('click', () => popup.hidden ? open() : close());
    popup.addEventListener('keydown', (event) => { if (event.key === 'Escape') { event.preventDefault(); close(); trigger.focus(); } });
    document.addEventListener('pointerdown', (event) => { if (!root.contains(event.target)) { close(); } });
    original.insertAdjacentElement('beforebegin', root);
    root.append(original, trigger, popup);
    original.classList.add('tf-date__native'); original.tabIndex = -1;
    original.addEventListener('change', syncLabel);
    syncLabel();
}
function initDates(root = document) { for (const input of qa('input[type="date"].form-control, input[type="time"].form-control, input[type="datetime-local"].form-control', root)) { enhanceDate(input); } }
onReady(() => initDates());
module.exports = { parseDate, normalizedTime, validDate, enhanceDate, initDates };
