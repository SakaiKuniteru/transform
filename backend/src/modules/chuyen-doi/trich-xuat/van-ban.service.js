'use strict';

const { DINH_DANG } = require('../../../constants/dinh-dang-tep');
const MA_LOI = require('../../../constants/ma-loi');
const { taoLoiTheoStatus: taoLoi } = require('../../../utils/loi');
const encodingService = require('../nhan-dien/encoding.service');
const pdfExtract = require('../tai-lieu/pdf/pdf.extract');
const wordRenderer = require('../tai-lieu/word/word.renderer');
const powerpointRenderer = require('../tai-lieu/powerpoint/powerpoint.renderer');

const DINH_DANG_TRUC_TIEP = Object.freeze([
    DINH_DANG.TXT,
    DINH_DANG.HTML,
    DINH_DANG.HTM,
    DINH_DANG.MARKDOWN,
    DINH_DANG.LATEX,
    DINH_DANG.RTF,
    DINH_DANG.JSON,
    DINH_DANG.XML,
    DINH_DANG.YAML,
    DINH_DANG.YML,
    DINH_DANG.CSV,
    DINH_DANG.TSV,
    DINH_DANG.TOML,
    DINH_DANG.INI,
    DINH_DANG.SQL
]);

function batBuocBuffer(value) { if (!Buffer.isBuffer(value)) { throw new TypeError('Dữ liệu trích xuất văn bản phải là Buffer.'); } return value; }

function docVanBan(buffer) {
    const input = batBuocBuffer(buffer);
    const encoding = encodingService.nhanDienEncoding(input);
    if (!encoding.laVanBan || !encoding.encoding) { throw taoLoi(422, 'Tệp không chứa văn bản có thể đọc trực tiếp.', MA_LOI.TEP_KHONG_HOP_LE); }
    return { vanBan: encodingService.docVanBan(input, encoding.encoding), encoding };
}

function boHtml(value) {
    return String(value || '')
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(?:p|div|li|h[1-6]|tr)>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

async function trichXuat(buffer, dinhDangNguon, options = {}) {
    const input = batBuocBuffer(buffer);
    const dinhDang = String(dinhDangNguon || '').trim().toLowerCase();
    let vanBan;
    let congCu;
    let metadata = {};
    if (DINH_DANG_TRUC_TIEP.includes(dinhDang)) {
        const doc = docVanBan(input);
        vanBan = [DINH_DANG.HTML, DINH_DANG.HTM].includes(dinhDang) && options.giuNguyenMarkup !== true ? boHtml(doc.vanBan) : doc.vanBan;
        congCu = 'transform-text-reader';
        metadata = { encoding: doc.encoding.encoding };
    } else if (dinhDang === DINH_DANG.PDF) {
        const result = await pdfExtract.trichXuatVanBan(input, options);
        vanBan = result.text;
        congCu = 'pdftotext';
        metadata = result.thongKe || {};
    } else if ([DINH_DANG.DOC, DINH_DANG.DOCX, DINH_DANG.ODT].includes(dinhDang)) {
        const result = await wordRenderer.chuyenSangVanBan(input, dinhDang, DINH_DANG.TXT, options);
        vanBan = result.buffer.toString('utf8');
        congCu = result.thongKe?.congCu || 'pandoc';
        metadata = result.thongKe || {};
    } else if ([DINH_DANG.PPT, DINH_DANG.PPTX, DINH_DANG.ODP].includes(dinhDang)) {
        const pdf = await powerpointRenderer.chuyenSangPdf(input, dinhDang, options);
        const result = await pdfExtract.trichXuatVanBan(pdf.buffer, options);
        vanBan = result.text;
        congCu = 'libreoffice+pdftotext';
        metadata = { soSlide: pdf.metadata?.soSlide ?? null, ...(result.thongKe || {}) };
    } else {
        throw taoLoi(415, `Chưa hỗ trợ trích xuất văn bản từ "${dinhDang || 'không xác định'}".`, MA_LOI.TEP_DINH_DANG_KHONG_HO_TRO);
    }
    const output = Buffer.from(vanBan, 'utf8');
    return { vanBan, buffer: output, dinhDang: DINH_DANG.TXT, mimeType: 'text/plain; charset=utf-8', kichThuocBytes: output.length, congCu, metadata, thongKe: { soKyTu: vanBan.length, soDong: vanBan ? vanBan.split(/\r?\n/).length : 0 } };
}

module.exports = {
    DINH_DANG_TRUC_TIEP,
    docVanBan,
    boHtml,
    trichXuat
};