'use strict';

const emailService = require('../../infrastructure/email/email.service');
const { TEN_JOB_EMAIL } = require('../../infrastructure/email/email.constant');

function chuanHoaData(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) { throw new TypeError('Dữ liệu email job không hợp lệ.'); }
    return data;
}

async function xuLy(job) {
    if (!job || job.name !== TEN_JOB_EMAIL.GUI_EMAIL) { throw new TypeError('Email job không hợp lệ.'); }
    const data = chuanHoaData(job.data);
    const ketQua = await emailService.guiEmail({ to: data.to, subject: data.subject, text: data.text, html: data.html, replyTo: data.replyTo, headers: data.headers });
    return { daGui: true, provider: ketQua.provider, messageId: ketQua.messageId };
}

module.exports = {
    xuLy,
    chuanHoaData
};