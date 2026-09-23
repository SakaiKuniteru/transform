'use strict';

const { qa, onReady } = require('../core/dom');

const timers = new WeakMap();

function layInterval(element) {
    const value = Number(element?.dataset?.jobRefreshInterval || 5000);
    return Number.isFinite(value) && value >= 1000 ? value : 5000;
}

function dungTheoDoi(element) {
    const timer = timers.get(element);
    if (timer) {
        clearTimeout(timer);
        timers.delete(element);
    }
}

function henLamMoi(element) {
    if (!element || element.dataset.jobRefreshEnabled !== 'true' || document.visibilityState === 'hidden') { return; }
    dungTheoDoi(element);
    const timer = setTimeout(() => {
        if (element.dataset.jobRefreshEnabled !== 'true') { return; }
        const url = element.dataset.jobRefreshUrl || window.location.href;
        const target = new URL(url, window.location.origin);
        if (target.origin !== window.location.origin) { return; }
        window.location.replace(target.href);
    }, layInterval(element));
    timers.set(element, timer);
}

function capNhatProgress(root) {
    for (const progress of qa('progress', root)) {
        const value = Number(progress.value || 0);
        const max = Number(progress.max || 100);
        const percent = Number.isFinite(value) && Number.isFinite(max) && max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
        progress.style.setProperty('--progress-value', `${percent}%`);
        progress.setAttribute('aria-valuenow', String(value));
        progress.setAttribute('aria-valuemax', String(max));
    }
}

function initJob(element) {
    if (!element || element.dataset.jobInitialized === 'true') { return; }
    element.dataset.jobInitialized = 'true';
    capNhatProgress(element);
    henLamMoi(element);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') { henLamMoi(element); } else { dungTheoDoi(element); }
    });
    window.addEventListener('beforeunload', () => dungTheoDoi(element), {
        once: true
    });
}

function initJobs(root = document) { for (const element of qa('[data-job-refresh-enabled], .job-detail, .conversion-result', root)) { initJob(element); } }

function init() { onReady(() => initJobs()); }

init();

module.exports = {
    layInterval,
    dungTheoDoi,
    henLamMoi,
    capNhatProgress,
    initJob,
    initJobs,
    init
};