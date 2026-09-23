'use strict';

class HttpError extends Error {
    constructor(message, options = {}) {
        super(message || 'Yêu cầu HTTP thất bại.');
        this.name = 'HttpError';
        this.status = Number(options.status || 0);
        this.code = options.code || null;
        this.data = options.data ?? null;
        this.response = options.response || null;
    }
}

function layCsrfToken() { return typeof document === 'undefined' ? null : document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || null; }

function taoUrl(url, params = null) {
    const target = new URL(String(url || ''), window.location.origin);
    if (target.origin !== window.location.origin) { throw new TypeError('Client HTTP chỉ cho phép gọi cùng origin.'); }
    for (const [ key, value ] of Object.entries(params || {})) {
        if (value === undefined || value === null || value === '') { continue; }
        if (Array.isArray(value)) { for (const item of value) { target.searchParams.append(key, String(item)); } } else { target.searchParams.set(key, String(value)); }
    }
    return target;
}

function laSafeMethod(method) { return [ 'GET', 'HEAD', 'OPTIONS' ].includes(String(method || 'GET').toUpperCase()); }

async function docResponse(response) {
    if (response.status === 204) { return null; }
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) { return response.json(); }
    return response.text();
}

function layThongBaoLoi(data, response) {
    if (data && typeof data === 'object') { return data.message || data.error?.message || `Yêu cầu thất bại (${response.status}).`; }
    if (typeof data === 'string' && data.trim()) { return data.trim(); }
    return `Yêu cầu thất bại (${response.status}).`;
}

async function request(url, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    const target = taoUrl(url, options.params);
    const headers = new Headers(options.headers || {});
    headers.set('Accept', options.accept || 'application/json');
    if (!laSafeMethod(method)) {
        const csrfToken = options.csrfToken || layCsrfToken();
        if (csrfToken && !headers.has('X-CSRF-Token')) { headers.set('X-CSRF-Token', csrfToken); }
    }
    let body = options.body;
    if (options.json !== undefined) {
        headers.set('Content-Type', 'application/json');
        body = JSON.stringify(options.json);
    }
    const response = await fetch(target, { method, headers, body, credentials: 'same-origin', signal: options.signal, redirect: options.redirect || 'follow' });
    const data = await docResponse(response);
    if (!response.ok) { throw new HttpError(layThongBaoLoi(data, response), { status: response.status, code: data?.error?.code || data?.code || null, data, response }); }
    return { response, data };
}

function get(url, options = {}) { return request(url, { ...options, method: 'GET' }); }

function post(url, options = {}) { return request(url, { ...options, method: 'POST' }); }

function patch(url, options = {}) { return request(url, { ...options, method: 'PATCH' }); }

function del(url, options = {}) { return request(url, { ...options, method: 'DELETE' }); }

module.exports = {
    HttpError,
    layCsrfToken,
    taoUrl,
    request,
    get,
    post,
    patch,
    del
};