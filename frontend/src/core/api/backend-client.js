'use strict';
const axios = require('axios');
const apiConfig = require('../../config/api.config');
const { ApiError } = require('./api-error');
const { chuanHoaApiResponse, laThatBai } = require('./api-response');
const client = axios.create({ baseURL: apiConfig.baseURL, timeout: apiConfig.timeout, withCredentials: false, headers: { Accept: 'application/json' }, maxRedirects: 0, validateStatus: () => true });

function chuanHoaDuongDan(url) {
    if (typeof url !== 'string' || !url.trim()) { throw new TypeError('Đường dẫn Backend không hợp lệ.'); }
    const giaTri = url.trim();
    if (/^[a-z][a-z\d+.-]*:\/\//i.test(giaTri) || giaTri.startsWith('//') || /[\r\n]/.test(giaTri)) { throw new TypeError('Chỉ được phép gọi đường dẫn tương đối của Backend.'); }
    return giaTri.startsWith('/') ? giaTri : `/${giaTri}`;
}

function taoHeaders(options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.accessToken) { headers.Authorization = `Bearer ${options.accessToken}`; }
    if (options.cookie) { headers.Cookie = options.cookie; }
    if (options.requestId) { headers['X-Request-Id'] = options.requestId; }
    if (typeof FormData !== 'undefined' && options.data instanceof FormData) { delete headers['Content-Type']; delete headers['content-type']; }
    return headers;
}

function taoRequestConfig(options = {}) {
    return { method: String(options.method || 'GET').toUpperCase(), url: chuanHoaDuongDan(options.url), params: options.params, data: options.data, headers: taoHeaders(options), timeout: options.timeout || apiConfig.timeout, responseType: options.responseType || 'json', signal: options.signal, maxBodyLength: options.maxBodyLength ?? Infinity, maxContentLength: options.maxContentLength ?? Infinity };
}

async function thucThiRaw(options = {}) {
    let response;
    try { response = await client.request(taoRequestConfig(options)); } catch (error) { throw ApiError.tuAxiosError(error); }
    if (response.status < 200 || response.status >= 300) { throw ApiError.tuResponse(response); }
    return response;
}

async function thucThi(options = {}) {
    const response = await thucThiRaw(options);
    let payload;
    try { payload = chuanHoaApiResponse(response.data); } catch (error) { throw new ApiError('Backend trả về dữ liệu không đúng cấu trúc API chuẩn.', { statusCode: 502, code: 'BACKEND_RESPONSE_KHONG_HOP_LE', requestId: response.headers?.['x-request-id'] || null, cause: error }); }
    if (laThatBai(payload)) { throw ApiError.tuResponse(response); }
    return payload;
}

function get(url, options = {}) { return thucThi({ ...options, method: 'GET', url }); }

function post(url, data, options = {}) { return thucThi({ ...options, method: 'POST', url, data }); }

function put(url, data, options = {}) { return thucThi({ ...options, method: 'PUT', url, data }); }

function patch(url, data, options = {}) { return thucThi({ ...options, method: 'PATCH', url, data }); }

function del(url, options = {}) { return thucThi({ ...options, method: 'DELETE', url }); }

module.exports = { thucThi, thucThiRaw, get, post, put, patch, delete: del };