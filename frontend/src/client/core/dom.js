'use strict';

function q(selector, root = document) { return root?.querySelector?.(selector) || null; }

function qa(selector, root = document) { return root?.querySelectorAll ? Array.from(root.querySelectorAll(selector)) : []; }

function closest(element, selector) { return element?.closest?.(selector) || null; }

function matches(element, selector) { return Boolean(element?.matches?.(selector)); }

function onReady(callback) {
    if (typeof callback !== 'function') { throw new TypeError('Callback DOM ready phải là function.'); }
    if (typeof document === 'undefined') { return; }
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', callback, { once: true }); return; }
    callback();
}

function hienThi(element) { if (!element) { return; } element.hidden = false; }

function an(element) { if (!element) { return; } element.hidden = true; }

function datDisabled(element, disabled = true) {
    if (!element) { return; }
    element.disabled = Boolean(disabled);
    element.setAttribute('aria-disabled', disabled ? 'true' : 'false');
}

function datBusy(element, busy = true) {
    if (!element) { return; }
    if (busy) { element.setAttribute('aria-busy', 'true'); } else { element.removeAttribute('aria-busy'); }
}

function layData(element, key, macDinh = null) {
    const value = element?.dataset?.[key];
    return value === undefined ? macDinh : value;
}

function datText(element, value = '') { if (!element) { return; } element.textContent = value ?? ''; }

function taoElement(tagName, attributes = {}, text = null) {
    const element = document.createElement(tagName);
    for (const [ key, value ] of Object.entries(attributes || {})) {
        if (value === false || value === null || value === undefined) { continue; }
        if (key === 'className') { element.className = String(value); continue; }
        if (key === 'dataset' && value && typeof value === 'object') {
            for (const [ dataKey, dataValue ] of Object.entries(value)) { element.dataset[dataKey] = String(dataValue); }
            continue;
        }
        if (value === true) { element.setAttribute(key, ''); continue; }
        element.setAttribute(key, String(value));
    }
    if (text !== null && text !== undefined) { element.textContent = String(text); }
    return element;
}

module.exports = {
    q,
    qa,
    closest,
    matches,
    onReady,
    hienThi,
    an,
    datDisabled,
    datBusy,
    layData,
    datText,
    taoElement
};