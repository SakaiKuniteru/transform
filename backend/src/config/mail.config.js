'use strict';

const env = require('./env');

const MAIL_CONFIG = Object.freeze({
    enabled: env.mail.enabled,
    provider: env.mail.provider,
    from: Object.freeze({ name: env.mail.fromName, address: env.mail.fromAddress }),
    replyTo: env.mail.replyTo,
    smtp: Object.freeze({
        host: env.mail.smtp.host,
        port: env.mail.smtp.port,
        secure: env.mail.smtp.secure,
        user: env.mail.smtp.user,
        password: env.mail.smtp.password,
        connectionTimeoutMs: env.mail.smtp.connectionTimeoutMs,
        greetingTimeoutMs: env.mail.smtp.greetingTimeoutMs,
        socketTimeoutMs: env.mail.smtp.socketTimeoutMs,
        pool: env.mail.smtp.pool,
        maxConnections: env.mail.smtp.maxConnections,
        maxMessages: env.mail.smtp.maxMessages
    })
});

function layNguoiGui() { return { name: MAIL_CONFIG.from.name, address: MAIL_CONFIG.from.address }; }

function layThongTinAnToan() {
    return {
        enabled: MAIL_CONFIG.enabled,
        provider: MAIL_CONFIG.provider,
        from: MAIL_CONFIG.from,
        replyTo: MAIL_CONFIG.replyTo,
        smtp: {
            host: MAIL_CONFIG.smtp.host,
            port: MAIL_CONFIG.smtp.port,
            secure: MAIL_CONFIG.smtp.secure,
            coXacThuc: Boolean(MAIL_CONFIG.smtp.user),
            pool: MAIL_CONFIG.smtp.pool,
            maxConnections: MAIL_CONFIG.smtp.maxConnections,
            maxMessages: MAIL_CONFIG.smtp.maxMessages
        }
    };
}

module.exports = {
    MAIL_CONFIG,
    layNguoiGui,
    layThongTinAnToan
};