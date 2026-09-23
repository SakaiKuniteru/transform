'use strict';
const MA_LOI_MAC_DINH = 'BACKEND_REQUEST_FAILED';

function layHeader(headers, ten) {
    if (!headers) { return null; }
    if (typeof headers.get === 'function') { return headers.get(ten) || null; }
    return headers[ten] || headers[String(ten).toLowerCase()] || null;
}

function layPayload(response) {
    const data = response?.data;
    return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
}

class ApiError extends Error {
    constructor(message, options = {}) {
        super(message || 'Không thể xử lý yêu cầu Backend.', options.cause ? { cause: options.cause } : undefined);
        this.name = 'ApiError';
        this.statusCode = Number.isInteger(options.statusCode) ? options.statusCode : 500;
        this.code = options.code || MA_LOI_MAC_DINH;
        this.details = options.details ?? null;
        this.data = options.data ?? null;
        this.meta = options.meta ?? null;
        this.requestId = options.requestId || null;
        this.isNetworkError = options.isNetworkError === true;
    }

    toJSON() {
        return { name: this.name, message: this.message, statusCode: this.statusCode, code: this.code, details: this.details, data: this.data, meta: this.meta, requestId: this.requestId, isNetworkError: this.isNetworkError };
    }

    static tuResponse(response) {
        const payload = layPayload(response);
        return new ApiError(payload?.message || `Backend trả về HTTP ${response?.status || 500}.`, { statusCode: Number.isInteger(response?.status) ? response.status : 500, code: payload?.error?.code || MA_LOI_MAC_DINH, details: payload?.error?.details ?? null, data: payload?.data ?? null, meta: payload?.meta ?? null, requestId: layHeader(response?.headers, 'x-request-id') });
    }

    static tuAxiosError(error) {
        if (error instanceof ApiError) { return error; }
        if (error?.response) { return ApiError.tuResponse(error.response); }
        const laTimeout = error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT';
        return new ApiError(laTimeout ? 'Backend phản hồi quá thời gian cho phép.' : 'Không thể kết nối tới Backend.', { statusCode: laTimeout ? 504 : 503, code: laTimeout ? 'BACKEND_TIMEOUT' : 'BACKEND_KHONG_KHA_DUNG', details: null, requestId: null, isNetworkError: true, cause: error });
    }
}

function laApiError(error) { return error instanceof ApiError; }

module.exports = { ApiError, laApiError };