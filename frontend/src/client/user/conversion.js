'use strict';

const { q, qa, onReady } = require('../core/dom');

function capNhatUrlTepNguon(select) {
    const tepId = String(select?.value || '').trim();
    if (!tepId) { return; }
    const url = new URL(window.location.href);
    if (url.searchParams.get('tepId') === tepId) { return; }
    url.searchParams.set('tepId', tepId);
    window.location.assign(url.href);
}

function initNguonChuyenDoi(select) {
    if (!select || select.dataset.conversionInitialized === 'true') { return; }
    select.dataset.conversionInitialized = 'true';
    select.addEventListener('change', () => {
        if (select.dataset.conversionReload === 'false') { return; }
        capNhatUrlTepNguon(select);
    });
}

function initToolLinks(root = document) {
    for (const link of qa('.conversion-tools__item[href]', root)) {
        if (link.dataset.conversionToolInitialized === 'true') { continue; }
        link.dataset.conversionToolInitialized = 'true';
        link.addEventListener('click', () => {
            const source = q('[data-conversion-source], select[name="tepNguonId"]', root);
            if (!source?.value) { return; }
            const url = new URL(link.href, window.location.origin);
            if (!url.searchParams.has('tepId')) {
                url.searchParams.set('tepId', source.value);
                link.href = url.href;
            }
        });
    }
}

function initConversion(root = document) {
    for (const select of qa('[data-conversion-source], select[name="tepNguonId"]', root)) { initNguonChuyenDoi(select); }
    initToolLinks(root);
}

function init() { onReady(() => initConversion()); }

init();

module.exports = {
    capNhatUrlTepNguon,
    initNguonChuyenDoi,
    initToolLinks,
    initConversion,
    init
};