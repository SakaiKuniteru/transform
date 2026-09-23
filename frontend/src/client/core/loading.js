'use strict';

const { q, datBusy } = require('./dom');

function layLoading(target = null) {
    if (target instanceof Element) { return target; }
    if (typeof target === 'string' && target) { return q(target.startsWith('#') || target.startsWith('[') || target.startsWith('.') ? target : `#${target}`); }
    return q('#global-loading') || q('[data-loading][data-global-loading]') || q('[data-loading]');
}

function hienLoading(target = null) {
    const loading = layLoading(target);
    if (!loading) { return null; }
    loading.hidden = false;
    loading.classList.add('is-visible');
    datBusy(document.body, true);
    return loading;
}

function anLoading(target = null) {
    const loading = layLoading(target);
    if (!loading) { return null; }
    loading.hidden = true;
    loading.classList.remove('is-visible');
    datBusy(document.body, false);
    return loading;
}

async function voiLoading(callback, target = null) {
    if (typeof callback !== 'function') { throw new TypeError('Callback loading phải là function.'); }
    hienLoading(target);
    try { return await callback(); } finally { anLoading(target); }
}

module.exports = {
    layLoading,
    hienLoading,
    anLoading,
    voiLoading
};