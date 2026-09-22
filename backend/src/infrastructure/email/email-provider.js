'use strict';

function chuanHoaMaProvider(value) { const ma = String(value || '').trim().toLowerCase(); if (!ma) { throw new TypeError('Mã email provider không được để trống.'); } if (!/^[a-z0-9][a-z0-9._-]{0,99}$/.test(ma)) { throw new TypeError('Mã email provider không hợp lệ.'); } return ma; }

function taoProvider(provider = {}) {
    if (!provider || typeof provider !== 'object' || Array.isArray(provider)) { throw new TypeError('Email provider phải là object.'); }
    if (typeof provider.gui !== 'function') { throw new TypeError('Email provider phải có hàm gui(input).'); }
    if (provider.kiemTra !== undefined && typeof provider.kiemTra !== 'function') { throw new TypeError('provider.kiemTra phải là function nếu được cung cấp.'); }
    if (provider.dong !== undefined && typeof provider.dong !== 'function') { throw new TypeError('provider.dong phải là function nếu được cung cấp.'); }
    const ma = chuanHoaMaProvider(provider.ma);
    return Object.freeze({
        ma,
        ten: String(provider.ten || ma).trim(),
        gui: provider.gui,
        kiemTra: provider.kiemTra || null,
        dong: provider.dong || null,
        metadata: Object.freeze({ ...(provider.metadata || {}) })
    });
}

module.exports = {
    chuanHoaMaProvider,
    taoProvider
};