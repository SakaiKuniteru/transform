'use strict';

const nodemailer = require('nodemailer');
const { MAIL_CONFIG } = require('../../../config/mail.config');
const { taoProvider } = require('../email-provider');
const { PROVIDER_EMAIL } = require('../email.constant');

let transporter = null;

function taoTransporter() {
    if (transporter) { return transporter; }
    const config = {
        host: MAIL_CONFIG.smtp.host,
        port: MAIL_CONFIG.smtp.port,
        secure: MAIL_CONFIG.smtp.secure,
        pool: MAIL_CONFIG.smtp.pool,
        maxConnections: MAIL_CONFIG.smtp.maxConnections,
        maxMessages: MAIL_CONFIG.smtp.maxMessages,
        connectionTimeout: MAIL_CONFIG.smtp.connectionTimeoutMs,
        greetingTimeout: MAIL_CONFIG.smtp.greetingTimeoutMs,
        socketTimeout: MAIL_CONFIG.smtp.socketTimeoutMs
    };
    if (MAIL_CONFIG.smtp.user && MAIL_CONFIG.smtp.password) { config.auth = { user: MAIL_CONFIG.smtp.user, pass: MAIL_CONFIG.smtp.password }; }
    transporter = nodemailer.createTransport(config);
    return transporter;
}

async function kiemTra() {
    if (!MAIL_CONFIG.smtp.host) { return { available: false, reason: 'SMTP_HOST_MISSING' }; }
    try { await taoTransporter().verify(); return { available: true }; } catch (error) { return { available: false, reason: error?.code || error?.message || 'SMTP_VERIFY_FAILED' }; }
}

async function gui(input = {}) {
    if (!input.from) { throw new TypeError('SMTP yêu cầu địa chỉ người gửi.'); }
    if (!input.to) { throw new TypeError('SMTP yêu cầu địa chỉ người nhận.'); }
    if (!input.subject) { throw new TypeError('SMTP yêu cầu tiêu đề email.'); }
    return taoTransporter().sendMail({
        from: input.from,
        to: input.to,
        replyTo: input.replyTo,
        subject: input.subject,
        text: input.text,
        html: input.html,
        headers: input.headers
    });
}

async function dong() {
    if (!transporter) { return; }
    const current = transporter;
    transporter = null;
    current.close();
}

module.exports = taoProvider({
    ma: PROVIDER_EMAIL.SMTP,
    ten: 'SMTP',
    gui,
    kiemTra,
    dong,
    metadata: { loai: 'smtp' }
});