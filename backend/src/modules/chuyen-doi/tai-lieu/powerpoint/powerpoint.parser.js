'use strict';

const AdmZip = require('adm-zip');
const { XMLParser } = require('fast-xml-parser');
const { DINH_DANG } = require('../../../../constants/dinh-dang-tep');
const MA_LOI = require('../../../../constants/ma-loi');
const { taoLoiTheoStatus: taoLoi } = require('../../../../utils/loi');

const DINH_DANG_POWERPOINT = Object.freeze([DINH_DANG.PPT, DINH_DANG.PPTX, DINH_DANG.ODP]);
const OLE_SIGNATURE = Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);
const ZIP_SIGNATURES = Object.freeze(['504b0304', '504b0506', '504b0708']);
const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', parseTagValue: false, trimValues: true });

function batBuocBuffer(value) { if (!Buffer.isBuffer(value) || !value.length) { throw taoLoi(422, 'Dữ liệu PowerPoint không hợp lệ hoặc rỗng.', MA_LOI.TEP_BI_HONG); } return value; }

function laZip(buffer) { const data = batBuocBuffer(buffer); return data.length >= 4 && ZIP_SIGNATURES.includes(data.subarray(0, 4).toString('hex').toLowerCase()); }

function laPpt(buffer) { const data = batBuocBuffer(buffer); return data.length >= OLE_SIGNATURE.length && data.subarray(0, OLE_SIGNATURE.length).equals(OLE_SIGNATURE); }

function moZip(buffer) { try { return new AdmZip(batBuocBuffer(buffer)); } catch { throw taoLoi(422, 'Không thể đọc cấu trúc PowerPoint nén.', MA_LOI.TEP_BI_HONG); } }

function docEntry(zip, ten) { const entry = zip.getEntry(ten); return entry ? entry.getData() : null; }

function docXml(zip, ten) { const data = docEntry(zip, ten); if (!data) { return null; } try { return xmlParser.parse(data.toString('utf8')); } catch { return null; } }

function laPptx(buffer) { if (!laZip(buffer)) { return false; } const zip = moZip(buffer); return Boolean(zip.getEntry('[Content_Types].xml') && zip.getEntry('ppt/presentation.xml')); }

function laOdp(buffer) { if (!laZip(buffer)) { return false; } const zip = moZip(buffer); const mimetype = docEntry(zip, 'mimetype'); return Boolean(mimetype && mimetype.toString('utf8').trim() === 'application/vnd.oasis.opendocument.presentation' && zip.getEntry('content.xml')); }

function nhanDienDinhDang(buffer) { if (laPpt(buffer)) { return DINH_DANG.PPT; } if (laPptx(buffer)) { return DINH_DANG.PPTX; } if (laOdp(buffer)) { return DINH_DANG.ODP; } return null; }

function thanhMang(value) { if (value === undefined || value === null) { return []; } return Array.isArray(value) ? value : [value]; }

function layText(value) {
    if (value === undefined || value === null) { return null; }
    if (Array.isArray(value)) { return value.map(layText).filter(Boolean).join(', ') || null; }
    if (typeof value === 'object' && '#text' in value) { return layText(value['#text']); }
    const text = String(value).trim();
    return text || null;
}

function layMetadataPptx(zip) {
    const core = docXml(zip, 'docProps/core.xml')?.['cp:coreProperties'] || {};
    const app = docXml(zip, 'docProps/app.xml')?.Properties || {};
    const slideEntries = zip.getEntries().filter((item) => /^ppt\/slides\/slide\d+\.xml$/i.test(item.entryName));
    const slidesApp = Number(app.Slides);
    return {
        tieuDe: layText(core['dc:title']),
        tacGia: layText(core['dc:creator']),
        nguoiSuaCuoi: layText(core['cp:lastModifiedBy']),
        chuDe: layText(core['dc:subject']),
        moTa: layText(core['dc:description']),
        ngayTao: layText(core['dcterms:created']),
        ngayCapNhat: layText(core['dcterms:modified']),
        ungDung: layText(app.Application),
        soSlide: Number.isSafeInteger(slidesApp) && slidesApp >= 0 ? slidesApp : slideEntries.length
    };
}

function layMetadataOdp(zip) {
    const meta = docXml(zip, 'meta.xml')?.['office:document-meta']?.['office:meta'] || {};
    const content = docXml(zip, 'content.xml');
    const pages = thanhMang(content?.['office:document-content']?.['office:body']?.['office:presentation']?.['draw:page']);
    return {
        tieuDe: layText(meta['dc:title']),
        tacGia: layText(meta['dc:creator']) || layText(meta['meta:initial-creator']),
        nguoiSuaCuoi: layText(meta['dc:creator']),
        chuDe: layText(meta['dc:subject']),
        moTa: layText(meta['dc:description']),
        ngayTao: layText(meta['meta:creation-date']),
        ngayCapNhat: layText(meta['dc:date']),
        ungDung: layText(meta['meta:generator']),
        soSlide: pages.length
    };
}

async function layMetadata(buffer, dinhDangDuKien = null) {
    const data = batBuocBuffer(buffer);
    const dinhDang = nhanDienDinhDang(data);
    if (!dinhDang) { throw taoLoi(415, 'Tệp không phải PPT, PPTX hoặc ODP hợp lệ.', MA_LOI.TEP_DINH_DANG_KHONG_HO_TRO); }
    if (dinhDangDuKien && String(dinhDangDuKien).trim().toLowerCase() !== dinhDang) { throw taoLoi(422, `Định dạng thực tế "${dinhDang}" không khớp định dạng dự kiến "${dinhDangDuKien}".`, MA_LOI.TEP_KHONG_HOP_LE); }
    const zip = dinhDang === DINH_DANG.PPT ? null : moZip(data);
    const metadata = dinhDang === DINH_DANG.PPTX ? layMetadataPptx(zip) : dinhDang === DINH_DANG.ODP ? layMetadataOdp(zip) : {};
    return { dinhDang, kichThuocBytes: data.length, mimeType: dinhDang === DINH_DANG.PPT ? 'application/vnd.ms-powerpoint' : dinhDang === DINH_DANG.PPTX ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation' : 'application/vnd.oasis.opendocument.presentation', ...metadata };
}

module.exports = {
    DINH_DANG_POWERPOINT,
    laPpt,
    laPptx,
    laOdp,
    nhanDienDinhDang,
    layMetadata
};