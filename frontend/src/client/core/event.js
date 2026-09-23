'use strict';

function on(target, type, listener, options) {
    if (!target?.addEventListener) { return () => {}; }
    target.addEventListener(type, listener, options);
    return () => target.removeEventListener(type, listener, options);
}

function once(target, type, listener, options = {}) { return on(target, type, listener, { ...options, once: true }); }

function delegate(target, type, selector, listener, options) {
    if (typeof listener !== 'function') { throw new TypeError('Listener phải là function.'); }
    return on(target, type, (event) => {
        const element = event.target?.closest?.(selector);
        if (!element || !target.contains(element)) { return; }
        listener(event, element);
    }, options);
}

function emit(target, type, detail = null, options = {}) {
    if (!target?.dispatchEvent) { return false; }
    const event = new CustomEvent(type, { detail, bubbles: options.bubbles !== false, cancelable: options.cancelable === true });
    return target.dispatchEvent(event);
}

module.exports = {
    on,
    once,
    delegate,
    emit
};