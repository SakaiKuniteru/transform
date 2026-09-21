'use strict';

const env = require('../../../config/env');
const MA_LOI = require('../../../constants/ma-loi');
const { taoLoi } = require('../../../utils/loi');

const providers = new Map();

function chuanHoaMaProvider(value) { const ma = String(value || '').trim().toLowerCase(); if (!ma) { throw new TypeError('Mã translation provider không được để trống.'); } if (!/^[a-z0-9][a-z0-9._-]{0,99}$/.test(ma)) { throw new TypeError('Mã translation provider không hợp lệ.'); } return ma; }

function chuanHoaProvider(provider) {
    if (!provider || typeof provider !== 'object' || Array.isArray(provider)) { throw new TypeError('Translation provider phải là object.'); }
    if (typeof provider.dich !== 'function') { throw new TypeError('Translation provider phải có hàm dich(input).'); }
    if (provider.nhanDienNgonNgu !== undefined && typeof provider.nhanDienNgonNgu !== 'function') { throw new TypeError('provider.nhanDienNgonNgu phải là function nếu được cung cấp.'); }
    if (provider.kiemTra !== undefined && typeof provider.kiemTra !== 'function') { throw new TypeError('provider.kiemTra phải là function nếu được cung cấp.'); }
    return Object.freeze({
        ma: chuanHoaMaProvider(provider.ma),
        ten: String(provider.ten || provider.ma).trim(),
        dich: provider.dich,
        nhanDienNgonNgu: provider.nhanDienNgonNgu || null,
        kiemTra: provider.kiemTra || null,
        metadata: Object.freeze({ ...(provider.metadata || {}) })
    });
}

function dangKyProvider(provider, options = {}) { const item = chuanHoaProvider(provider); if (providers.has(item.ma) && options.thayThe !== true) { throw new Error(`Translation provider "${item.ma}" đã được đăng ký.`); } providers.set(item.ma, item); return item; }

function huyDangKyProvider(ma) { const key = chuanHoaMaProvider(ma); const item = providers.get(key) || null; providers.delete(key); return item; }

function layProvider(ma) { if (!ma) { return null; } return providers.get(chuanHoaMaProvider(ma)) || null; }

function layDanhSachProvider() { return Array.from(providers.values()); }

function layProviderMacDinh() { const ma = env.tichHop.dich.provider ? chuanHoaMaProvider(env.tichHop.dich.provider) : null; if (!ma) { return null; } return providers.get(ma) || null; }

async function chonProvider(ma = null) {
    const provider = ma ? layProvider(ma) : layProviderMacDinh();
    if (!provider) { throw taoLoi({ maLoi: MA_LOI.DICH_KHONG_HO_TRO, thongBao: 'Chưa cấu hình translation provider khả dụng.', statusCode: 503, expose: true }); }
    if (provider.kiemTra && !await provider.kiemTra()) { throw taoLoi({ maLoi: MA_LOI.DICH_KHONG_HO_TRO, thongBao: `Translation provider "${provider.ma}" hiện không khả dụng.`, statusCode: 503, expose: true }); }
    return provider;
}

function taoAbortSignal(signal, timeoutMs) {
    const controller = new AbortController();
    let timeout = null;
    let onAbort = null;
    if (signal) { onAbort = () => controller.abort(signal.reason); if (signal.aborted) { onAbort(); } else { signal.addEventListener('abort', onAbort, { once: true }); } }
    if (timeoutMs > 0) { timeout = setTimeout(() => controller.abort(new Error('TRANSLATION_TIMEOUT')), timeoutMs); timeout.unref?.(); }
    return {
        signal: controller.signal,
        donDep: () => {
            if (timeout) { clearTimeout(timeout); }
            if (signal && onAbort) { signal.removeEventListener('abort', onAbort); }
        }
    };
}

async function goiHttpJson(url, body, options = {}) {
    const timeoutMs = Number(options.timeoutMs || env.tichHop.dich.timeoutMs || 120000);
    const abort = taoAbortSignal(options.signal, timeoutMs);
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                ...(options.apiKey ? { authorization: `Bearer ${options.apiKey}` } : {}),
                ...(options.headers || {})
            },
            body: JSON.stringify(body),
            signal: abort.signal
        });
        const text = await response.text();
        let payload = null;
        try { payload = text ? JSON.parse(text) : {}; } catch { throw taoLoi({ maLoi: MA_LOI.DICH_THAT_BAI, thongBao: 'Translation provider trả dữ liệu không phải JSON hợp lệ.', statusCode: 502, expose: true, metadata: { statusCode: response.status } }); }
        if (!response.ok) { throw taoLoi({ maLoi: MA_LOI.DICH_THAT_BAI, thongBao: payload?.message || payload?.error?.message || `Translation provider trả HTTP ${response.status}.`, statusCode: 502, expose: true, metadata: { providerStatus: response.status } }); }
        return payload?.data && typeof payload.data === 'object' ? payload.data : payload;
    } catch (error) {
        if (error?.name === 'AbortError' || abort.signal.aborted) { throw taoLoi({ maLoi: MA_LOI.DICH_TIMEOUT, thongBao: 'Translation provider phản hồi quá thời gian cho phép.', statusCode: 504, expose: true, cause: error }); }
        if (error?.maLoi) { throw error; }
        throw taoLoi({ maLoi: MA_LOI.DICH_THAT_BAI, thongBao: 'Không thể gọi translation provider.', statusCode: 502, expose: true, cause: error });
    } finally { abort.donDep(); }
}

function taoHttpProvider(options = {}) {
    const ma = chuanHoaMaProvider(options.ma || env.tichHop.dich.provider || 'transform-http');
    const baseUrl = String(options.baseUrl || env.tichHop.dich.baseUrl || '').trim();
    const apiKey = options.apiKey ?? env.tichHop.dich.apiKey ?? null;
    const timeoutMs = Number(options.timeoutMs || env.tichHop.dich.timeoutMs || 120000);
    if (!baseUrl) { throw new TypeError('Translation HTTP provider yêu cầu baseUrl.'); }
    return chuanHoaProvider({
        ma,
        ten: options.ten || `HTTP Translation Provider (${ma})`,
        metadata: { loai: 'transform-http' },
        async kiemTra() { return true; },
        async nhanDienNgonNgu(input = {}) {
            const data = await goiHttpJson(baseUrl, {
                action: 'detect-language',
                input: { text: String(input.vanBan || '') },
                options: input.tuyChon || {}
            }, {
                apiKey,
                timeoutMs,
                signal: input.signal,
                headers: options.headers
            });
            const ngonNgu = String(data.ngonNgu || data.language || data.detectedLanguage || '').trim().toLowerCase();
            if (!ngonNgu) { throw taoLoi({ maLoi: MA_LOI.DICH_THAT_BAI, thongBao: 'Translation provider không trả ngôn ngữ nhận diện.', statusCode: 502, expose: true }); }
            return {
                ngonNgu,
                doTinCay: Number.isFinite(Number(data.doTinCay ?? data.confidence)) ? Number(data.doTinCay ?? data.confidence) : null,
                provider: ma,
                raw: data
            };
        },
        async dich(input = {}) {
            const data = await goiHttpJson(baseUrl, {
                action: 'translate',
                input: {
                    text: String(input.vanBan || ''),
                    sourceLanguage: input.ngonNguNguon || 'auto',
                    targetLanguage: input.ngonNguDich,
                    glossary: input.bangThuatNgu || []
                },
                options: input.tuyChon || {}
            }, {
                apiKey,
                timeoutMs,
                signal: input.signal,
                headers: options.headers
            });
            const vanBan = data.vanBan ?? data.text ?? data.translation ?? data.translatedText;
            if (typeof vanBan !== 'string') { throw taoLoi({ maLoi: MA_LOI.DICH_THAT_BAI, thongBao: 'Translation provider không trả văn bản dịch hợp lệ.', statusCode: 502, expose: true }); }
            return {
                vanBan,
                ngonNguNguon: data.ngonNguNguon || data.sourceLanguage || data.detectedLanguage || input.ngonNguNguon || null,
                ngonNguDich: data.ngonNguDich || data.targetLanguage || input.ngonNguDich,
                provider: ma,
                usage: data.usage || null,
                raw: data
            };
        }
    });
}

module.exports = {
    dangKyProvider,
    huyDangKyProvider,
    layProvider,
    layDanhSachProvider,
    layProviderMacDinh,
    chonProvider,
    taoHttpProvider
};