'use strict';

const { escapeHtml, taoTemplateEmail } = require('./template.service');

function taoXacThucEmailTemplate({ hoTen = '', maOtp, ttlSeconds = 600 } = {}) {
    const ten = String(hoTen || '').trim() || 'bạn';
    const otp = String(maOtp || '').trim();
    const soPhut = Math.max(1, Math.ceil(Number(ttlSeconds || 0) / 60));
    if (!/^\d+$/.test(otp)) { throw new TypeError('Mã OTP xác thực email không hợp lệ.'); }
    const tenAnToan = escapeHtml(ten);
    const otpAnToan = escapeHtml(otp);
    return taoTemplateEmail({
        subject: 'Mã xác thực email Transform',
        preheader: `Mã xác thực của bạn là ${otp}`,
        tieuDe: 'Xác thực địa chỉ email',
        noiDungText: `Xin chào ${ten},\n\nMã xác thực email Transform của bạn là: ${otp}\nMã có hiệu lực trong ${soPhut} phút.\n\nKhông chia sẻ mã này với bất kỳ ai. Nếu bạn không thực hiện đăng ký, hãy bỏ qua email này.`,
        noiDungHtml: `<p style="margin:0 0 16px;line-height:1.7;">Xin chào <strong>${tenAnToan}</strong>,</p><p style="margin:0 0 16px;line-height:1.7;">Sử dụng mã dưới đây để xác thực địa chỉ email của bạn:</p><div style="margin:24px 0;padding:18px;text-align:center;background:#f1f5f9;border-radius:12px;font-size:30px;font-weight:700;letter-spacing:8px;">${otpAnToan}</div><p style="margin:0 0 12px;line-height:1.7;">Mã có hiệu lực trong <strong>${soPhut} phút</strong>.</p><p style="margin:0;color:#64748b;line-height:1.7;">Không chia sẻ mã này với bất kỳ ai. Nếu bạn không thực hiện đăng ký, hãy bỏ qua email này.</p>`
    });
}

module.exports = { taoXacThucEmailTemplate };