'use strict';

const { MAIL_CONFIG, layNguoiGui } = require('../../config/mail.config');
const MA_LOI = require('../../constants/ma-loi');
const { loiYeuCau, loiDichVuKhongKhaDung, loiHeThong } = require('../../utils/loi');
const smtpProvider = require('./providers/smtp.provider');

const providers = new Map([[smtpProvider.ma, smtpProvider]]);

function chuanHoaDiaChiEmail(value, tenTruong = 'email') {
    if (typeof value === 'string') {
        const email = value.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { throw loiYeuCau(`${tenTruong} không hợp lệ.`, MA_LOI.EMAIL_DIA_CHI_KHONG_HOP_LE); }
        return email;
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) { throw loiYeuCau(`${tenTruong} không hợp lệ.`, MA_LOI.EMAIL_DIA_CHI_KHONG_HOP_LE); }
    const address = String(value.address || value.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) { throw loiYeuCau(`${tenTruong} không hợp lệ.`, MA_LOI.EMAIL_DIA_CHI_KHONG_HOP_LE); }
    const name = String(value.name || value.ten || '').trim();
    return name ? { name, address } : address;
}

function chuanHoaDanhSachNguoiNhan(value) {
    const danhSach = Array.isArray(value) ? value : [value];
    if (!danhSach.length) { throw loiYeuCau('Email phải có ít nhất một người nhận.', MA_LOI.EMAIL_DIA_CHI_KHONG_HOP_LE); }
    return danhSach.map((item) => chuanHoaDiaChiEmail(item, 'Địa chỉ email người nhận'));
}

function layProvider(ma = MAIL_CONFIG.provider) { const key = String(ma || '').trim().toLowerCase(); return providers.get(key) || null; }

function layDanhSachProvider() { return Array.from(providers.values()); }

async function kiemTraSanSang(ma = MAIL_CONFIG.provider) {
    if (!MAIL_CONFIG.enabled) { return { available: false, reason: 'MAIL_DISABLED', provider: ma || null }; }
    const provider = layProvider(ma);
    if (!provider) { return { available: false, reason: 'PROVIDER_NOT_FOUND', provider: ma || null }; }
    if (!provider.kiemTra) { return { available: true, provider: provider.ma }; }
    try { const ketQua = await provider.kiemTra(); return { available: ketQua === true || ketQua?.available === true, provider: provider.ma, ...(typeof ketQua === 'object' && ketQua ? ketQua : {}) }; } catch (error) { return { available: false, provider: provider.ma, reason: error?.code || error?.message || 'PROVIDER_CHECK_FAILED' }; }
}

async function guiEmail(input = {}) {
    if (!MAIL_CONFIG.enabled) { throw loiDichVuKhongKhaDung('Dịch vụ email chưa được bật.', MA_LOI.EMAIL_KHONG_KHA_DUNG); }
    if (!input || typeof input !== 'object' || Array.isArray(input)) { throw new TypeError('Dữ liệu gửi email phải là object.'); }
    const provider = layProvider(input.provider || MAIL_CONFIG.provider);
    if (!provider) { throw loiDichVuKhongKhaDung('Không tìm thấy email provider khả dụng.', MA_LOI.EMAIL_KHONG_KHA_DUNG); }
    const subject = String(input.subject || '').trim();
    if (!subject) { throw loiYeuCau('Tiêu đề email không được để trống.', MA_LOI.DU_LIEU_KHONG_HOP_LE); }
    const text = input.text === null || input.text === undefined ? null : String(input.text);
    const html = input.html === null || input.html === undefined ? null : String(input.html);
    if (!text && !html) { throw loiYeuCau('Email phải có nội dung text hoặc HTML.', MA_LOI.DU_LIEU_KHONG_HOP_LE); }
    const to = chuanHoaDanhSachNguoiNhan(input.to);
    const from = input.from ? chuanHoaDiaChiEmail(input.from, 'Địa chỉ email người gửi') : layNguoiGui();
    const replyTo = input.replyTo ? chuanHoaDiaChiEmail(input.replyTo, 'Địa chỉ Reply-To') : MAIL_CONFIG.replyTo || undefined;
    try {
        const ketQua = await provider.gui({ from, to, replyTo, subject, text: text || undefined, html: html || undefined, headers: input.headers || undefined });
        return {
            provider: provider.ma,
            messageId: ketQua?.messageId || null,
            accepted: Array.isArray(ketQua?.accepted) ? ketQua.accepted : [],
            rejected: Array.isArray(ketQua?.rejected) ? ketQua.rejected : [],
            response: ketQua?.response || null
        };
    } catch (error) {
        if (error?.maLoi) { throw error; }
        throw loiHeThong('Không thể gửi email.', MA_LOI.EMAIL_GUI_THAT_BAI, error, { provider: provider.ma });
    }
}

async function dongTatCaProvider() {
    for (const provider of providers.values()) { if (provider.dong) { await provider.dong(); } }
}

module.exports = {
    chuanHoaDiaChiEmail,
    chuanHoaDanhSachNguoiNhan,
    layProvider,
    layDanhSachProvider,
    kiemTraSanSang,
    guiEmail,
    dongTatCaProvider
};