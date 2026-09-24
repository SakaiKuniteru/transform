'use strict';
const { onReady, qa } = require('./dom');
const initialized = new WeakSet();
function enhanceSelect(select) {
    if (initialized.has(select) || select.disabled || select.dataset.selectNative === 'true') { return; }
    initialized.add(select);
    const multiple = select.multiple;
    const searchable = select.dataset.searchable === 'true' || (select.dataset.searchable !== 'false' && select.options.length > 8);
    const allowAll = select.dataset.allowAll === 'true';
    const allValue = select.dataset.allValue ?? '';
    if (allowAll && !Array.from(select.options).some((option) => option.value === allValue)) { select.add(new Option('Tất cả', allValue), 0); }
    const root = document.createElement('div');
    root.className = 'tf-select';
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'tf-select__trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', select.getAttribute('aria-label') || 'Chọn giá trị');
    const label = document.createElement('span');
    label.className = 'tf-select__label';
    trigger.append(label);
    const arrow = document.createElement('span');
    arrow.className = 'tf-select__arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '⌄';
    trigger.append(arrow);
    const popup = document.createElement('div');
    popup.className = 'tf-select__popup';
    popup.hidden = true;
    const search = searchable ? document.createElement('input') : null;
    if (search) {
        search.type = 'search';
        search.className = 'tf-select__search';
        search.placeholder = 'Tìm kiếm...';
        search.setAttribute('aria-label', 'Tìm lựa chọn');
        popup.append(search);
    }
    const list = document.createElement('div');
    list.className = 'tf-select__options';
    list.setAttribute('role', 'listbox');
    if (multiple) { list.setAttribute('aria-multiselectable', 'true'); }
    popup.append(list);
    root.append(trigger, popup);
    select.insertAdjacentElement('beforebegin', root);
    root.prepend(select);
    select.classList.add('tf-select__native');
    select.tabIndex = -1;
    function selectedLabel() {
        const values = Array.from(select.selectedOptions).filter((option) => option.value !== '' || !multiple);
        if (multiple && !values.length) { return allowAll ? 'Tất cả' : 'Chọn một hoặc nhiều'; }
        if (!values.length) { return select.dataset.placeholder || select.options[0]?.textContent || 'Chọn'; }
        if (multiple && values.length > 2) { return `${values.length} lựa chọn`; }
        return values.map((option) => option.textContent.trim()).join(', ');
    }
    function updateLabel() { label.textContent = selectedLabel(); trigger.classList.toggle('is-placeholder', !select.value && !multiple); }
    function render(filter = '') {
        list.replaceChildren();
        const needle = filter.trim().toLocaleLowerCase('vi');
        for (const option of Array.from(select.options)) {
            if (option.hidden || (needle && !option.textContent.toLocaleLowerCase('vi').includes(needle))) { continue; }
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'tf-select__option';
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', option.selected ? 'true' : 'false');
            item.disabled = option.disabled;
            if (multiple) {
                const check = document.createElement('span');
                check.className = 'tf-select__check';
                check.setAttribute('aria-hidden', 'true');
                check.textContent = option.selected ? '✓' : '';
                item.append(check);
            }
            const text = document.createElement('span');
            text.textContent = option.textContent;
            item.append(text);
            item.addEventListener('click', () => {
                if (multiple) {
                    if (allowAll && option.value === allValue) {
                        for (const current of select.options) { current.selected = current === option; }
                    } else {
                        option.selected = !option.selected;
                        if (allowAll) { for (const current of select.options) { if (current.value === allValue) { current.selected = false; } } }
                    }
                } else { select.value = option.value; }
                select.dispatchEvent(new Event('change', { bubbles: true }));
                updateLabel();
                if (multiple) { render(search?.value || ''); } else { close(); trigger.focus(); }
            });
            list.append(item);
        }
        if (!list.children.length) { const empty = document.createElement('p'); empty.className = 'tf-select__empty'; empty.textContent = 'Không có kết quả'; list.append(empty); }
    }
    function close() { popup.hidden = true; root.classList.remove('is-open'); trigger.setAttribute('aria-expanded', 'false'); }
    function open() { if (select.disabled) { return; } popup.hidden = false; root.classList.add('is-open'); trigger.setAttribute('aria-expanded', 'true'); render(); if (search) { search.value = ''; search.focus(); } else { list.querySelector('button:not(:disabled)')?.focus(); } }
    trigger.addEventListener('click', () => popup.hidden ? open() : close());
    trigger.addEventListener('keydown', (event) => { if (['ArrowDown', 'Enter', ' '].includes(event.key) && popup.hidden) { event.preventDefault(); open(); } });
    popup.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') { event.preventDefault(); close(); trigger.focus(); return; }
        if (!['ArrowDown', 'ArrowUp'].includes(event.key)) { return; }
        const options = Array.from(list.querySelectorAll('button:not(:disabled)'));
        if (!options.length) { return; }
        event.preventDefault();
        const index = options.indexOf(document.activeElement);
        options[(index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length].focus();
    });
    search?.addEventListener('input', () => render(search.value));
    document.addEventListener('pointerdown', (event) => { if (!root.contains(event.target)) { close(); } });
    select.addEventListener('change', () => { updateLabel(); if (!popup.hidden) { render(search?.value || ''); } });
    updateLabel();
}
function initSelects(root = document) { for (const select of qa('select.form-select, select[data-public-tool-select]', root)) { enhanceSelect(select); } }
onReady(() => initSelects());
module.exports = { enhanceSelect, initSelects };
