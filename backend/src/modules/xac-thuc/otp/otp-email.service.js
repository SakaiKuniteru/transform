'use strict';

const crypto = require('node:crypto');
const { MAIL_CONFIG } = require('../../../config/mail.config');
const { TEN_QUEUE } = require('../../../config/queue');
const queueService = require('../../../infrastructure/queue/queue.service');
const { TEN_JOB_EMAIL, DO_UU_TIEN_EMAIL } = require('../../../infrastructure/email/email.constant');
const { taoXacThucEmailTemplate } = require('../../../infrastructure/email/templates/xac-thuc-email.template');
const { taoDatLaiMatKhauTemplate } = require('../../../infrastructure/email/templates/dat-lai-mat-khau.template');
const { MUC_DICH_OTP } = require('./otp.constant');

function layTemplate(mucDich) {
    if (mucDich === MUC_DICH_OTP.XAC_THUC_EMAIL) { return taoXacThucEmailTemplate; }
    if (mucDich === MUC_DICH_OTP.DAT_LAI_MAT_KHAU) { return taoDatLaiMatKhauTemplate; }
    throw new TypeError('Mục đích OTP email không được hỗ trợ.');
}

function taoJobId() { return `email-${crypto.randomUUID()}`; }

async function xepHangEmail({ to, subject, text, html, replyTo = null, headers = null } = {}) {
    const job = await queueService.themJob({
        tenQueue: TEN_QUEUE.EMAIL,
        tenJob: TEN_JOB_EMAIL.GUI_EMAIL,
        jobId: taoJobId(),
        data: { to, subject, text, html, replyTo, headers },
        options: {
            priority: DO_UU_TIEN_EMAIL.CAO,
            removeOnComplete: true,
            removeOnFail: true
        }
    });
    return { daXepHang: true, queueName: TEN_QUEUE.EMAIL, jobId: String(job.id) };
}

async function gui({ nguoiDung, mucDich, maOtp, ttlSeconds } = {}) {
    if (!nguoiDung?.email) { throw new TypeError('Người nhận OTP email không hợp lệ.'); }
    if (!maOtp) { throw new TypeError('Mã OTP email không được để trống.'); }
    if (!MAIL_CONFIG.enabled) { return { daGui: false, daXepHang: false, boQua: true, lyDo: 'MAIL_DISABLED' }; }
    const template = layTemplate(mucDich)({ hoTen: nguoiDung.hoTen, maOtp, ttlSeconds });
    const job = await xepHangEmail({ to: nguoiDung.email, subject: template.subject, text: template.text, html: template.html });
    return { daGui: false, daXepHang: true, boQua: false, queueName: job.queueName, jobId: job.jobId };
}

async function guiKetQuaOtp({ nguoiDung, mucDich, otp } = {}) { if (!otp) { throw new TypeError('Kết quả OTP không hợp lệ.'); } return gui({ nguoiDung, mucDich, maOtp: otp.maOtp, ttlSeconds: otp.ttlSeconds }); }

module.exports = {
    layTemplate,
    taoJobId,
    xepHangEmail,
    gui,
    guiKetQuaOtp
};