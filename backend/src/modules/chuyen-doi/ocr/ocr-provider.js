'use strict';

function taoProvider(provider = {}) {
    if (!provider || typeof provider !== 'object' || Array.isArray(provider)) { throw new TypeError('OCR provider phải là object.'); }
    const ma = String(provider.ma || '').trim().toLowerCase();
    if (!ma) { throw new TypeError('OCR provider phải có mã.'); }
    if (typeof provider.nhanDang !== 'function') { throw new TypeError('OCR provider phải có hàm nhanDang(input).'); }
    return Object.freeze({
        ma,
        ten: String(provider.ten || ma).trim(),
        kiemTra: typeof provider.kiemTra === 'function' ? provider.kiemTra : async () => ({ available: true }),
        nhanDang: provider.nhanDang
    });
}

module.exports = { taoProvider };