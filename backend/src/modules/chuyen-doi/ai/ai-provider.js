'use strict';

const env = require('../../../config/env');
const MA_LOI = require('../../../constants/ma-loi');
const { taoLoi } = require('../../../utils/loi');

const providers = new Map();

function chuanHoaMaProvider(value) { const ma = String(value || '').trim().toLowerCase(); if (!ma) { throw new TypeError('Mã AI provider không được để trống.'); } if (!/^[a-z0-9][a-z0-9._-]{0,99}$/.test(ma)) { throw new TypeError('Mã AI provider không hợp lệ.'); } return ma; }

function chuanHoaProvider(provider) {
    if (!provider || typeof provider !== 'object' || Array.isArray(provider)) { throw new TypeError('AI provider phải là object.'); }
    if (typeof provider.taoKeHoach !== 'function' && typeof provider.xuLyVanBan !== 'function') { throw new TypeError('AI provider phải có taoKeHoach(input) hoặc xuLyVanBan(input).'); }
    if (provider.kiemTra !== undefined && typeof provider.kiemTra !== 'function') { throw new TypeError('provider.kiemTra phải là function nếu được cung cấp.'); }
    return Object.freeze({
        ma: chuanHoaMaProvider(provider.ma),
        ten: String(provider.ten || provider.ma).trim(),
        taoKeHoach: provider.taoKeHoach || null,
        xuLyVanBan: provider.xuLyVanBan || null,
        kiemTra: provider.kiemTra || null,
        metadata: Object.freeze({ ...(provider.metadata || {}) })
    });
}

function dangKyProvider(provider, options = {}) { const item = chuanHoaProvider(provider); if (providers.has(item.ma) && options.thayThe !== true) { throw new Error(`AI provider "${item.ma}" đã được đăng ký.`); } providers.set(item.ma, item); return item; }

function huyDangKyProvider(ma) { const key = chuanHoaMaProvider(ma); const item = providers.get(key) || null; providers.delete(key); return item; }

function layProvider(ma) { if (!ma) { return null; } return providers.get(chuanHoaMaProvider(ma)) || null; }

function layDanhSachProvider() { return Array.from(providers.values()); }

function layProviderMacDinh() { const ma = env.tichHop.ai.provider ? chuanHoaMaProvider(env.tichHop.ai.provider) : null; return ma ? providers.get(ma) || null : null; }

async function chonProvider(ma = null, capability = null) {
    const provider = ma ? layProvider(ma) : layProviderMacDinh();
    if (!provider) { throw taoLoi({ maLoi: MA_LOI.AI_KHONG_KHA_DUNG, thongBao: 'Chưa cấu hình AI provider khả dụng.', statusCode: 503, expose: true }); }
    if (capability && typeof provider[capability] !== 'function') { throw taoLoi({ maLoi: MA_LOI.AI_KHONG_KHA_DUNG, thongBao: `AI provider "${provider.ma}" không hỗ trợ ${capability}.`, statusCode: 503, expose: true }); }
    if (provider.kiemTra && !await provider.kiemTra()) { throw taoLoi({ maLoi: MA_LOI.AI_KHONG_KHA_DUNG, thongBao: `AI provider "${provider.ma}" hiện không khả dụng.`, statusCode: 503, expose: true }); }
    return provider;
}

function taoAbortSignal(signal, timeoutMs) {
    const controller = new AbortController();
    let timeout = null;
    let onAbort = null;
    if (signal) { onAbort = () => controller.abort(signal.reason); if (signal.aborted) { onAbort(); } else { signal.addEventListener('abort', onAbort, { once: true }); } }
    if (timeoutMs > 0) { timeout = setTimeout(() => controller.abort(new Error('AI_TIMEOUT')), timeoutMs); timeout.unref?.(); }
    return {
        signal: controller.signal,
        donDep: () => {
            if (timeout) { clearTimeout(timeout); }
            if (signal && onAbort) { signal.removeEventListener('abort', onAbort); }
        }
    };
}

async function goiHttpJson(url, body, options = {}) {
    const timeoutMs = Number(options.timeoutMs || env.tichHop.ai.timeoutMs || 120000);
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
        let payload;
        try { payload = text ? JSON.parse(text) : {}; } catch { throw taoLoi({ maLoi: MA_LOI.AI_PHAN_HOI_KHONG_HOP_LE, thongBao: 'AI provider trả dữ liệu không phải JSON hợp lệ.', statusCode: 502, expose: true }); }
        if (!response.ok) { throw taoLoi({ maLoi: MA_LOI.AI_THAT_BAI, thongBao: payload?.message || payload?.error?.message || `AI provider trả HTTP ${response.status}.`, statusCode: 502, expose: true, metadata: { providerStatus: response.status } }); }
        return payload?.data && typeof payload.data === 'object' ? payload.data : payload;
    } catch (error) {
        if (error?.name === 'AbortError' || abort.signal.aborted) { throw taoLoi({ maLoi: MA_LOI.AI_TIMEOUT, thongBao: 'AI provider phản hồi quá thời gian cho phép.', statusCode: 504, expose: true, cause: error }); }
        if (error?.maLoi) { throw error; }
        throw taoLoi({ maLoi: MA_LOI.AI_THAT_BAI, thongBao: 'Không thể gọi AI provider.', statusCode: 502, expose: true, cause: error });
    } finally { abort.donDep(); }
}

function taoHttpProvider(options = {}) {
    const ma = chuanHoaMaProvider(options.ma || env.tichHop.ai.provider || 'transform-http');
    const baseUrl = String(options.baseUrl || env.tichHop.ai.baseUrl || '').trim();
    const apiKey = options.apiKey ?? env.tichHop.ai.apiKey ?? null;
    const model = String(options.model || env.tichHop.ai.model || '').trim() || null;
    const timeoutMs = Number(options.timeoutMs || env.tichHop.ai.timeoutMs || 120000);
    if (!baseUrl) { throw new TypeError('AI HTTP provider yêu cầu baseUrl.'); }
    async function goi(action, input, signal) { return goiHttpJson(baseUrl, { action, model, input }, { apiKey, timeoutMs, signal, headers: options.headers }); }
    return chuanHoaProvider({
        ma,
        ten: options.ten || `HTTP AI Provider (${ma})`,
        metadata: { loai: 'transform-http', model },
        async kiemTra() { return true; },
        async taoKeHoach(input = {}) {
            const data = await goi('plan-transform', input, input.signal);
            return {
                output: data.output ?? data.keHoach ?? data.plan ?? data,
                model: data.model || model,
                usage: data.usage || null,
                raw: data
            };
        },
        async xuLyVanBan(input = {}) {
            const data = await goi('transform-text', input, input.signal);
            const output = data.output ?? data.vanBan ?? data.text;
            if (typeof output !== 'string') { throw taoLoi({ maLoi: MA_LOI.AI_PHAN_HOI_KHONG_HOP_LE, thongBao: 'AI provider không trả văn bản hợp lệ.', statusCode: 502, expose: true }); }
            return {
                vanBan: output,
                model: data.model || model,
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