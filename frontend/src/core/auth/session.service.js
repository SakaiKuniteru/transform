'use strict';
const TEN_TRANG_THAI = 'auth';
const TEN_COOKIE_BACKEND = 'backendCookies';

function batBuocSession(req) {
    if (!req?.session) { throw new TypeError('Request chưa được gắn session.'); }
    return req.session;
}

function laySetCookie(headers) {
    if (!headers) { return []; }
    const value = typeof headers.get === 'function' ? headers.get('set-cookie') : headers['set-cookie'];
    if (!value) { return []; }
    return Array.isArray(value) ? value : [ value ];
}

function tachCookie(setCookie) {
    if (typeof setCookie !== 'string' || !setCookie) { return null; }
    const dauChamPhay = setCookie.indexOf(';');
    const cap = (dauChamPhay >= 0 ? setCookie.slice(0, dauChamPhay) : setCookie).trim();
    const dauBang = cap.indexOf('=');
    if (dauBang <= 0) { return null; }
    const ten = cap.slice(0, dauBang).trim();
    const giaTri = cap.slice(dauBang + 1).trim();
    if (!/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(ten) || /[\r\n]/.test(giaTri)) { return null; }
    const xoa = giaTri === '' || /(?:^|;)\s*max-age=0(?:;|$)/i.test(setCookie);
    return { ten, giaTri, xoa };
}

function dongBoCookieBackend(req, headers) {
    const session = batBuocSession(req);
    const cookies = { ...(session[TEN_COOKIE_BACKEND] || {}) };
    for (const setCookie of laySetCookie(headers)) { const cookie = tachCookie(setCookie); if (!cookie) { continue; } if (cookie.xoa) { delete cookies[cookie.ten]; } else { cookies[cookie.ten] = cookie.giaTri; } }
    session[TEN_COOKIE_BACKEND] = cookies;
    return cookies;
}

function layCookieBackend(req) {
    const cookies = batBuocSession(req)[TEN_COOKIE_BACKEND] || {};
    const danhSach = Object.entries(cookies).filter(([ ten, giaTri ]) => ten && typeof giaTri === 'string').map(([ ten, giaTri ]) => `${ten}=${giaTri}`);
    return danhSach.length ? danhSach.join('; ') : null;
}

function layAuth(req) { return batBuocSession(req)[TEN_TRANG_THAI] || null; }

function layNguoiDung(req) { return layAuth(req)?.nguoiDung || null; }

function layAccessToken(req) { return layAuth(req)?.accessToken || null; }

function daDangNhap(req) { return Boolean(layNguoiDung(req)?.id && layAccessToken(req)); }

function accessTokenSapHetHan(req, khoangDemMs = 30000) {
    const hetHanLuc = layAuth(req)?.accessTokenExpiresAt;
    if (!hetHanLuc) { return true; }
    const thoiGian = new Date(hetHanLuc).getTime();
    return !Number.isFinite(thoiGian) || thoiGian <= Date.now() + khoangDemMs;
}

function coTheLamMoi(req) { return Boolean(layCookieBackend(req)); }

function regenerate(req) {
    const session = batBuocSession(req);
    return new Promise((resolve, reject) => session.regenerate((error) => error ? reject(error) : resolve()));
}

function save(req) {
    const session = batBuocSession(req);
    return new Promise((resolve, reject) => session.save((error) => error ? reject(error) : resolve()));
}

async function luuDangNhap(req, ketQua, headers = null) {
    if (!ketQua?.nguoiDung?.id || !ketQua?.accessToken) { throw new TypeError('Dữ liệu đăng nhập không hợp lệ.'); }
    await regenerate(req);
    const session = batBuocSession(req);
    session[TEN_TRANG_THAI] = { nguoiDung: ketQua.nguoiDung, accessToken: ketQua.accessToken, accessTokenExpiresAt: ketQua.accessTokenExpiresAt || null };
    dongBoCookieBackend(req, headers);
    await save(req);
    return session[TEN_TRANG_THAI];
}

async function capNhatDangNhap(req, ketQua, headers = null) {
    if (!ketQua?.nguoiDung?.id || !ketQua?.accessToken) { throw new TypeError('Dữ liệu làm mới đăng nhập không hợp lệ.'); }
    const session = batBuocSession(req);
    session[TEN_TRANG_THAI] = { nguoiDung: ketQua.nguoiDung, accessToken: ketQua.accessToken, accessTokenExpiresAt: ketQua.accessTokenExpiresAt || null };
    dongBoCookieBackend(req, headers);
    await save(req);
    return session[TEN_TRANG_THAI];
}

async function xoaDangNhap(req, headers = null) {
    const session = batBuocSession(req);
    if (headers) { dongBoCookieBackend(req, headers); }
    delete session[TEN_TRANG_THAI];
    delete session[TEN_COOKIE_BACKEND];
    await save(req);
}

function huySession(req) {
    const session = batBuocSession(req);
    return new Promise((resolve, reject) => session.destroy((error) => error ? reject(error) : resolve()));
}

module.exports = { layAuth, layNguoiDung, layAccessToken, layCookieBackend, daDangNhap, accessTokenSapHetHan, coTheLamMoi, dongBoCookieBackend, luuDangNhap, capNhatDangNhap, xoaDangNhap, huySession };