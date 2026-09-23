'use strict';
const appConfig = require('../../config/app.config');
const authContext = require('../auth/auth-context');
const { asset } = require('./view-helper');
const LOAI_TOAST = new Set([ 'success', 'error', 'warning', 'info' ]);
const AUTH_AN_DANH = Object.freeze({
    daDangNhap: false,
    nguoiDung: null,
    loaiTaiKhoan: null,
    laNguoiDung: false,
    laQuanTri: false,
    laHeThong: false,
    coTheTruyCapKhuVucNguoiDung: false,
    coTheTruyCapKhuVucQuanTri: false
});

function chuanHoaChuoi(value, macDinh = null) {
    if (typeof value !== 'string') { return macDinh; }
    const ketQua = value.trim();
    return ketQua || macDinh;
}

function chuanHoaDanhSach(value) { return Array.isArray(value) ? value.filter((item) => item !== null && item !== undefined) : []; }

function chuanHoaAssets(input = {}) {
    const styles = chuanHoaDanhSach(input.styles).map((item) => asset(item));
    const scripts = chuanHoaDanhSach(input.scripts).map((item) => {
        if (typeof item === 'string') { return { src: asset(item), defer: true }; }
        if (!item || typeof item !== 'object' || !item.src) { throw new TypeError('Script asset không hợp lệ.'); }
        return { ...item, src: asset(item.src), defer: item.defer !== false };
    });
    return {
        styles,
        scripts,
        favicon: input.favicon ? asset(input.favicon) : null
    };
}

function chuanHoaPage(input = {}) {
    return {
        title: chuanHoaChuoi(input.title, appConfig.name),
        description: chuanHoaChuoi(input.description),
        canonical: chuanHoaChuoi(input.canonical),
        noIndex: input.noIndex === true,
        ogType: chuanHoaChuoi(input.ogType, 'website'),
        ogImage: chuanHoaChuoi(input.ogImage),
        bodyClass: chuanHoaChuoi(input.bodyClass)
    };
}

function chuanHoaToasts(toasts = []) {
    return chuanHoaDanhSach(toasts).map((toast, index) => {
        const item = typeof toast === 'string' ? { message: toast } : toast || {};
        const type = LOAI_TOAST.has(item.type) ? item.type : 'info';
        return {
            id: item.id || `toast-${index + 1}`,
            type,
            title: chuanHoaChuoi(item.title),
            message: chuanHoaChuoi(item.message, ''),
            duration: Number.isSafeInteger(item.duration) && item.duration >= 0 ? item.duration : 5000,
            persistent: item.persistent === true
        };
    }).filter((toast) => toast.message);
}

function chuanHoaBreadcrumb(items = []) {
    const danhSach = chuanHoaDanhSach(items).map((item) => typeof item === 'string' ? { label: item, url: null, current: false } : {
        label: chuanHoaChuoi(item?.label, ''),
        url: chuanHoaChuoi(item?.url),
        current: item?.current === true
    }).filter((item) => item.label);
    if (danhSach.length && !danhSach.some((item) => item.current)) { danhSach[danhSach.length - 1].current = true; }
    return danhSach;
}

function taoUrlPhanTrang(baseUrl, query, page) {
    const params = new URLSearchParams();
    for (const [ key, value ] of Object.entries(query || {})) {
        if (value === null || value === undefined || value === '') { continue; }
        if (Array.isArray(value)) { for (const item of value) { params.append(key, String(item)); } }
        else { params.set(key, String(value)); }
    }
    params.set('page', String(page));
    const chuoi = params.toString();
    return chuoi ? `${baseUrl}?${chuoi}` : baseUrl;
}

function taoDanhSachTrang(page, totalPages, windowSize) {
    const trang = new Set([ 1, totalPages ]);
    for (let value = Math.max(1, page - windowSize); value <= Math.min(totalPages, page + windowSize); value += 1) { trang.add(value); }
    const sapXep = Array.from(trang).sort((a, b) => a - b);
    const ketQua = [];
    for (let index = 0; index < sapXep.length; index += 1) {
        const value = sapXep[index];
        const truoc = sapXep[index - 1];
        if (index > 0 && value - truoc > 1) { ketQua.push({ ellipsis: true, key: `ellipsis-${truoc}-${value}` }); }
        ketQua.push({ number: value, current: value === page, key: `page-${value}` });
    }
    return ketQua;
}

function taoPagination(options = {}) {
    const page = Number.isSafeInteger(Number(options.page)) ? Math.max(1, Number(options.page)) : 1;
    const totalPages = Number.isSafeInteger(Number(options.totalPages)) ? Math.max(1, Number(options.totalPages)) : 1;
    const currentPage = Math.min(page, totalPages);
    const windowSize = Number.isSafeInteger(Number(options.windowSize)) ? Math.max(0, Number(options.windowSize)) : 2;
    const baseUrl = chuanHoaChuoi(options.baseUrl, '/');
    const pages = taoDanhSachTrang(currentPage, totalPages, windowSize).map((item) => item.ellipsis ? item : { ...item, url: taoUrlPhanTrang(baseUrl, options.query, item.number) });
    return {
        visible: totalPages > 1,
        page: currentPage,
        totalPages,
        hasPrevious: currentPage > 1,
        hasNext: currentPage < totalPages,
        previousUrl: currentPage > 1 ? taoUrlPhanTrang(baseUrl, options.query, currentPage - 1) : null,
        nextUrl: currentPage < totalPages ? taoUrlPhanTrang(baseUrl, options.query, currentPage + 1) : null,
        pages
    };
}

function taoRequestContext(req) {
    const originalUrl = req?.originalUrl || req?.url || '/';
    const path = originalUrl.split('?', 1)[0] || '/';
    return {
        method: req?.method || 'GET',
        path,
        originalUrl,
        requestId: req?.id || req?.requestId || null
    };
}

function layAuthContext(req, res) {
    if (res?.locals?.auth) { return res.locals.auth; }
    if (req?.authContext) { return req.authContext; }
    if (!req?.session) { return AUTH_AN_DANH; }
    return authContext.taoAuthContext(req);
}

function taoViewContext(req, res, data = {}) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) { throw new TypeError('View data phải là một object.'); }
    const page = chuanHoaPage({ ...(data.page || {}), title: data.title || data.page?.title, description: data.description || data.page?.description });
    const assets = chuanHoaAssets(data.assets || {});
    const breadcrumb = chuanHoaBreadcrumb(data.breadcrumb || []);
    const toasts = chuanHoaToasts(data.toasts || res?.locals?.toasts || []);
    return {
        ...data,
        app: {
            name: appConfig.name,
            version: appConfig.version,
            environment: appConfig.environment
        },
        page,
        title: page.title,
        request: taoRequestContext(req),
        auth: layAuthContext(req, res),
        csrfToken: data.csrfToken || res?.locals?.csrfToken || null,
        assets,
        breadcrumb,
        toasts,
        currentYear: new Date().getFullYear()
    };
}

module.exports = {
    chuanHoaAssets,
    chuanHoaPage,
    chuanHoaToasts,
    chuanHoaBreadcrumb,
    taoPagination,
    taoRequestContext,
    taoViewContext
};