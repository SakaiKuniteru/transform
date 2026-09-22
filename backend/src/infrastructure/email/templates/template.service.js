'use strict';

const { taoEmailLayout } = require('./email-layout.template');

function escapeHtml(value = '') { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }

function taoTemplateEmail({ subject, preheader = '', tieuDe, noiDungHtml, noiDungText } = {}) {
    const subjectChuan = String(subject || '').trim();
    const tieuDeChuan = String(tieuDe || '').trim();
    const text = String(noiDungText || '').trim();
    const html = String(noiDungHtml || '').trim();
    if (!subjectChuan) { throw new TypeError('Tiêu đề email không được để trống.'); }
    if (!tieuDeChuan) { throw new TypeError('Tiêu đề nội dung email không được để trống.'); }
    if (!text) { throw new TypeError('Nội dung text email không được để trống.'); }
    if (!html) { throw new TypeError('Nội dung HTML email không được để trống.'); }
    return { subject: subjectChuan, text, html: taoEmailLayout({ preheader: escapeHtml(preheader), tieuDe: escapeHtml(tieuDeChuan), noiDungHtml: html }) };
}

module.exports = { escapeHtml, taoTemplateEmail };