'use strict';

const AdmZip = require('adm-zip');
const { XMLParser } = require('fast-xml-parser');
const { DINH_DANG } = require('../../../../constants/dinh-dang-tep');
const MA_LOI = require('../../../../constants/ma-loi');
const { taoLoiTheoStatus: taoLoi } = require('../../../../utils/loi');

const DINH_DANG_WORD = Object.freeze([DINH_DANG.DOC, DINH_DANG.DOCX, DINH_DANG.ODT]);
const DOC_SIGNATURE = Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);
const ZIP_SIGNATURES = Object.freeze(['504b0304', '504b0506', '504b0708']);
const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', parseTagValue: false, trimValues: true });

function batBuocBuffer(value) { if (!Buffer.isBuffer(value) || !value.length) { throw taoLoi(422, 'Dữ liệu tài liệu Word không hợp lệ hoặc rỗng.', MA_LOI.TEP_BI_HONG); } return value; }

function laZip(buffer) { const data = batBuocBuffer(buffer); return data.length >= 4 && ZIP_SIGNATURES.includes(data.subarray(0, 4).toString('hex').toLowerCase()); }

function laDoc(buffer) { const data = batBuocBuffer(buffer); return data.length >= DOC_SIGNATURE.length && data.subarray(0, DOC_SIGNATURE.length).equals(DOC_SIGNATURE); }

function moZip(buffer) { try { return new AdmZip(batBuocBuffer(buffer)); } catch { throw taoLoi(422, 'Không thể đọc cấu trúc tài liệu nén.', MA_LOI.TEP_BI_HONG); } }

function docEntry(zip, ten) { const entry = zip.getEntry(ten); return entry ? entry.getData() : null; }

function docXml(zip, ten) { const buffer = docEntry(zip, ten); if (!buffer) { return null; } try { return xmlParser.parse(buffer.toString('utf8')); } catch { return null; } }

function laDocx(buffer) { if (!laZip(buffer)) { return false; } const zip = moZip(buffer); return Boolean(zip.getEntry('[Content_Types].xml') && zip.getEntry('word/document.xml')); }

function laOdt(buffer) { if (!laZip(buffer)) { return false; } const zip = moZip(buffer); const mimetype = docEntry(zip, 'mimetype'); return Boolean(mimetype && mimetype.toString('utf8').trim() === 'application/vnd.oasis.opendocument.text' && zip.getEntry('content.xml')); }

function nhanDienDinhDang(buffer) { if (laDoc(buffer)) { return DINH_DANG.DOC; } if (laDocx(buffer)) { return DINH_DANG.DOCX; } if (laOdt(buffer)) { return DINH_DANG.ODT; } return null; }

function giaTri(value) {
    if (value === undefined || value === null || value === '') { return null; }
    if (Array.isArray(value)) { return value.map(giaTri).filter(Boolean).join(', ') || null; }
    if (typeof value === 'object' && '#text' in value) { return giaTri(value['#text']); }
    return String(value).trim() || null;
}

function soNguyen(value) { const number = Number(value); return Number.isSafeInteger(number) && number >= 0 ? number : null; }

function layMetadataDocx(buffer) {
    const zip = moZip(buffer);
    const core = docXml(zip, 'docProps/core.xml')?.['cp:coreProperties'] || {};
    const app = docXml(zip, 'docProps/app.xml')?.Properties || {};
    return {
        tieuDe: giaTri(core['dc:title']),
        tacGia: giaTri(core['dc:creator']),
        nguoiSuaCuoi: giaTri(core['cp:lastModifiedBy']),
        chuDe: giaTri(core['dc:subject']),
        moTa: giaTri(core['dc:description']),
        tuKhoa: giaTri(core['cp:keywords']),
        ngayTao: giaTri(core['dcterms:created']),
        ngayCapNhat: giaTri(core['dcterms:modified']),
        ungDung: giaTri(app.Application),
        soTrang: soNguyen(app.Pages),
        soTu: soNguyen(app.Words),
        soKyTu: soNguyen(app.Characters),
        soDoan: soNguyen(app.Paragraphs)
    };
}

function layMetadataOdt(buffer) {
    const zip = moZip(buffer);
    const meta = docXml(zip, 'meta.xml')?.['office:document-meta']?.['office:meta'] || {};
    const statistic = meta['meta:document-statistic'] || {};
    return {
        tieuDe: giaTri(meta['dc:title']),
        tacGia: giaTri(meta['dc:creator']) || giaTri(meta['meta:initial-creator']),
        nguoiSuaCuoi: giaTri(meta['dc:creator']),
        chuDe: giaTri(meta['dc:subject']),
        moTa: giaTri(meta['dc:description']),
        tuKhoa: giaTri(meta['meta:keyword']),
        ngayTao: giaTri(meta['meta:creation-date']),
        ngayCapNhat: giaTri(meta['dc:date']),
        ungDung: giaTri(meta['meta:generator']),
        soTrang: soNguyen(statistic['@_meta:page-count']),
        soTu: soNguyen(statistic['@_meta:word-count']),
        soKyTu: soNguyen(statistic['@_meta:character-count']),
        soDoan: soNguyen(statistic['@_meta:paragraph-count'])
    };
}

async function layMetadata(buffer, dinhDangDuKien = null) {
    const data = batBuocBuffer(buffer);
    const dinhDang = nhanDienDinhDang(data);
    if (!dinhDang) { throw taoLoi(415, 'Tệp không phải tài liệu DOC, DOCX hoặc ODT hợp lệ.', MA_LOI.TEP_DINH_DANG_KHONG_HO_TRO); }
    if (dinhDangDuKien && String(dinhDangDuKien).trim().toLowerCase() !== dinhDang) { throw taoLoi(422, `Định dạng thực tế "${dinhDang}" không khớp định dạng dự kiến "${dinhDangDuKien}".`, MA_LOI.TEP_KHONG_HOP_LE); }
    const metadata = dinhDang === DINH_DANG.DOCX ? layMetadataDocx(data) : dinhDang === DINH_DANG.ODT ? layMetadataOdt(data) : {};
    return {
        dinhDang,
        mimeType: dinhDang === DINH_DANG.DOC ? 'application/msword' : dinhDang === DINH_DANG.DOCX ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/vnd.oasis.opendocument.text',
        kichThuocBytes: data.length,
        ...metadata
    };
}

module.exports = {
    DINH_DANG_WORD,
    laDoc,
    laDocx,
    laOdt,
    nhanDienDinhDang,
    layMetadata
};