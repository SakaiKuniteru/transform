'use strict';

const { qa, onReady } = require('../core/dom');

function dinhDangThoiGian(ms) {
    const tongGiay = Math.max(0, Math.ceil(ms / 1000));
    const phut = Math.floor(tongGiay / 60);
    const giay = tongGiay % 60;
    return `${String(phut).padStart(2, '0')}:${String(giay).padStart(2, '0')}`;
}

function parseThoiGian(value) {
    if (!value) { return null; }
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
}

function initOtpInput(input) {
    if (!input || input.dataset.otpInitialized === 'true') { return; }
    input.dataset.otpInitialized = 'true';
    input.addEventListener('paste', () => requestAnimationFrame(() => {
        input.value = input.value.trim();
        input.dispatchEvent(new Event('input', {
            bubbles: true
        }));
    }));
}

function initOtpCountdown(element) {
    if (!element || element.dataset.otpCountdownInitialized === 'true') { return; }
    const expiresAt = parseThoiGian(element.dataset.otpExpireAt);
    if (!expiresAt) { return; }
    element.dataset.otpCountdownInitialized = 'true';
    const prefix = element.dataset.otpPrefix || 'Mã xác thực còn hiệu lực';
    let timer = null;
    const capNhat = () => {
        const conLai = expiresAt - Date.now();
        if (conLai <= 0) {
            element.textContent = element.dataset.otpExpiredText || 'Mã xác thực đã hết hạn.';
            element.dispatchEvent(new CustomEvent('otp:expired', {
                bubbles: true
            }));
            if (timer) { clearInterval(timer); }
            return;
        }
        element.textContent = `${prefix}: ${dinhDangThoiGian(conLai)}`;
    };
    capNhat();
    timer = setInterval(capNhat, 1000);
}

function initOtp(root = document) {
    for (const input of qa('input[autocomplete="one-time-code"], input[data-otp-input]', root)) { initOtpInput(input); }
    for (const element of qa('[data-otp-expire-at]', root)) { initOtpCountdown(element); }
}

function init() { onReady(() => initOtp()); }

init();

module.exports = {
    dinhDangThoiGian,
    parseThoiGian,
    initOtpInput,
    initOtpCountdown,
    initOtp,
    init
};