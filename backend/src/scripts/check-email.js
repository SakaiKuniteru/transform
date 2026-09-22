'use strict';

const { MAIL_CONFIG, layNguoiGui, layThongTinAnToan } = require('../config/mail.config');
const emailService = require('../infrastructure/email/email.service');

async function chay() {
    if (!MAIL_CONFIG.enabled) { throw new Error('MAIL_ENABLED phải bằng true để kiểm tra email production.'); }
    const sender = emailService.chuanHoaDiaChiEmail(layNguoiGui(), 'MAIL_FROM_ADDRESS');
    const provider = emailService.layProvider(MAIL_CONFIG.provider);
    if (!provider) { throw new Error(`Không tìm thấy email provider "${MAIL_CONFIG.provider}".`); }
    const sanSang = await emailService.kiemTraSanSang(provider.ma);
    if (!sanSang.available) { throw new Error(`Email provider "${provider.ma}" chưa sẵn sàng: ${sanSang.reason || 'UNKNOWN'}.`); }
    console.log('[Email] Config:', layThongTinAnToan());
    console.log(`[Email] Sender: ${typeof sender === 'string' ? sender : sender.address}`);
    console.log(`[Email] Provider: ${provider.ma}`);
    console.log('[Email] SMTP connection PASS');
    console.log('[Email] Provider readiness PASS');
}

if (require.main === module) { void chay().catch((error) => { console.error('[Email] FAIL:', error.message); process.exitCode = 1; }); }

module.exports = { chay };