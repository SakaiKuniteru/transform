'use strict';

const path = require('node:path');
const AdmZip = require('adm-zip');
const { XMLParser } = require('fast-xml-parser');
const { DINH_DANG } = require('../../../../constants/dinh-dang-tep');
const MA_LOI = require('../../../../constants/ma-loi');
const { taoLoiTheoStatus: taoLoi } = require('../../../../utils/loi');

const DINH_DANG_EXCEL = Object.freeze([DINH_DANG.XLS, DINH_DANG.XLSX, DINH_DANG.ODS]);
const OLE_SIGNATURE = Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);
const ZIP_SIGNATURES = Object.freeze(['504b0304', '504b0506', '504b0708']);
const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', parseTagValue: false, trimValues: false });

function batBuocBuffer(value) { if (!Buffer.isBuffer(value) || !value.length) { throw taoLoi(422, 'Dữ liệu bảng tính không hợp lệ hoặc rỗng.', MA_LOI.TEP_BI_HONG); } return value; }

function thanhMang(value) { if (value === undefined || value === null) { return []; } return Array.isArray(value) ? value : [value]; }

function laZip(buffer) { const data = batBuocBuffer(buffer); return data.length >= 4 && ZIP_SIGNATURES.includes(data.subarray(0, 4).toString('hex').toLowerCase()); }

function laXls(buffer) { const data = batBuocBuffer(buffer); return data.length >= OLE_SIGNATURE.length && data.subarray(0, OLE_SIGNATURE.length).equals(OLE_SIGNATURE); }

function moZip(buffer) { try { return new AdmZip(batBuocBuffer(buffer)); } catch { throw taoLoi(422, 'Không thể đọc cấu trúc bảng tính nén.', MA_LOI.TEP_BI_HONG); } }

function docEntry(zip, ten) { const entry = zip.getEntry(ten); return entry ? entry.getData() : null; }

function docXml(zip, ten) { const buffer = docEntry(zip, ten); if (!buffer) { return null; } try { return xmlParser.parse(buffer.toString('utf8')); } catch { return null; } }

function laXlsx(buffer) { if (!laZip(buffer)) { return false; } const zip = moZip(buffer); return Boolean(zip.getEntry('[Content_Types].xml') && zip.getEntry('xl/workbook.xml')); }

function laOds(buffer) { if (!laZip(buffer)) { return false; } const zip = moZip(buffer); const mimetype = docEntry(zip, 'mimetype'); return Boolean(mimetype && mimetype.toString('utf8').trim() === 'application/vnd.oasis.opendocument.spreadsheet' && zip.getEntry('content.xml')); }

function nhanDienDinhDang(buffer) { if (laXls(buffer)) { return DINH_DANG.XLS; } if (laXlsx(buffer)) { return DINH_DANG.XLSX; } if (laOds(buffer)) { return DINH_DANG.ODS; } return null; }

function layTextXml(value) {
    if (value === undefined || value === null) { return ''; }
    if (Array.isArray(value)) { return value.map(layTextXml).join(''); }
    if (typeof value !== 'object') { return String(value); }
    let text = value['#text'] !== undefined ? String(value['#text']) : '';
    for (const [key, item] of Object.entries(value)) { if (key !== '#text' && !key.startsWith('@_')) { text += layTextXml(item); } }
    return text;
}

function layGiaTriCore(value) { const text = layTextXml(value).trim(); return text || null; }

function chuanHoaTargetWorkbook(value) {
    let target = String(value || '').replaceAll('\\', '/').replace(/^\/+/, '');
    if (!target) { return null; }
    if (target.startsWith('xl/')) { return path.posix.normalize(target); }
    return path.posix.normalize(path.posix.join('xl', target));
}

function laySharedStrings(zip) {
    const xml = docXml(zip, 'xl/sharedStrings.xml');
    const items = thanhMang(xml?.sst?.si);
    return items.map((item) => layTextXml(item));
}

function cotTuThamChieu(value) {
    const match = String(value || '').match(/^([A-Z]+)\d+$/i);
    if (!match) { return null; }
    let result = 0;
    for (const char of match[1].toUpperCase()) { result = result * 26 + char.charCodeAt(0) - 64; }
    return result - 1;
}

function layGiaTriCell(cell, sharedStrings) {
    if (!cell) { return null; }
    const type = String(cell['@_t'] || '').trim();
    if (type === 'inlineStr') { return layTextXml(cell.is); }
    const raw = cell.v;
    if (raw === undefined || raw === null) { return cell.is ? layTextXml(cell.is) : null; }
    if (type === 's') { const index = Number(raw); return Number.isSafeInteger(index) && index >= 0 ? sharedStrings[index] ?? null : null; }
    if (type === 'b') { return String(raw) === '1'; }
    if (['str', 'e', 'd'].includes(type)) { return String(raw); }
    const number = Number(raw);
    return Number.isFinite(number) && String(raw).trim() !== '' ? number : String(raw);
}

function docSheetXlsx(zip, tenEntry, sharedStrings, options = {}) {
    const maxRows = Number(options.maxRows || 10000);
    const maxColumns = Number(options.maxColumns || 1000);
    const xml = docXml(zip, tenEntry);
    const rows = thanhMang(xml?.worksheet?.sheetData?.row).slice(0, maxRows);
    return rows.map((row) => {
        const result = [];
        let sequentialIndex = 0;
        for (const cell of thanhMang(row?.c).slice(0, maxColumns)) {
            const index = cotTuThamChieu(cell?.['@_r']);
            const target = index === null ? sequentialIndex : index;
            if (target >= maxColumns) { continue; }
            while (result.length < target) { result.push(null); }
            result[target] = layGiaTriCell(cell, sharedStrings);
            sequentialIndex = target + 1;
        }
        return result;
    });
}

function layDanhSachSheetXlsx(zip, options = {}) {
    const workbook = docXml(zip, 'xl/workbook.xml');
    const relationships = docXml(zip, 'xl/_rels/workbook.xml.rels');
    const relations = new Map(thanhMang(relationships?.Relationships?.Relationship).map((item) => [String(item?.['@_Id'] || ''), chuanHoaTargetWorkbook(item?.['@_Target'])]));
    const sharedStrings = laySharedStrings(zip);
    return thanhMang(workbook?.workbook?.sheets?.sheet).slice(0, Number(options.maxSheets || 100)).map((sheet, index) => {
        const relationId = String(sheet?.['@_r:id'] || '');
        const target = relations.get(relationId);
        return {
            ten: String(sheet?.['@_name'] || `Sheet${index + 1}`),
            thuTu: index + 1,
            rows: target ? docSheetXlsx(zip, target, sharedStrings, options) : []
        };
    });
}

function lapGiaTri(value, soLan, max) { const count = Number(soLan || 1); const anToan = Number.isSafeInteger(count) && count > 0 ? Math.min(count, max) : 1; return Array.from({ length: anToan }, () => value); }

function layGiaTriOds(cell) {
    const type = String(cell?.['@_office:value-type'] || '').trim();
    if (type === 'float' || type === 'currency' || type === 'percentage') { const number = Number(cell?.['@_office:value']); return Number.isFinite(number) ? number : layTextXml(cell?.['text:p']); }
    if (type === 'boolean') { return String(cell?.['@_office:boolean-value']) === 'true'; }
    if (type === 'date') { return cell?.['@_office:date-value'] || layTextXml(cell?.['text:p']) || null; }
    if (type === 'time') { return cell?.['@_office:time-value'] || layTextXml(cell?.['text:p']) || null; }
    const text = layTextXml(cell?.['text:p']);
    if (text !== '') { return text; }
    return cell?.['@_office:string-value'] || null;
}

function docDongOds(row, options = {}) {
    const maxColumns = Number(options.maxColumns || 1000);
    const result = [];
    const cells = [...thanhMang(row?.['table:table-cell']), ...thanhMang(row?.['table:covered-table-cell'])];
    for (const cell of cells) {
        if (result.length >= maxColumns) { break; }
        const value = layGiaTriOds(cell);
        const repeated = Number(cell?.['@_table:number-columns-repeated'] || 1);
        const conLai = maxColumns - result.length;
        result.push(...lapGiaTri(value, repeated, conLai));
    }
    return result;
}

function layDanhSachSheetOds(zip, options = {}) {
    const xml = docXml(zip, 'content.xml');
    const spreadsheet = xml?.['office:document-content']?.['office:body']?.['office:spreadsheet'];
    const tables = thanhMang(spreadsheet?.['table:table']).slice(0, Number(options.maxSheets || 100));
    return tables.map((table, index) => {
        const rows = [];
        for (const row of thanhMang(table?.['table:table-row'])) {
            if (rows.length >= Number(options.maxRows || 10000)) { break; }
            const repeated = Number(row?.['@_table:number-rows-repeated'] || 1);
            const copies = Math.min(Number.isSafeInteger(repeated) && repeated > 0 ? repeated : 1, Number(options.maxRows || 10000) - rows.length);
            const data = docDongOds(row, options);
            for (let i = 0; i < copies; i += 1) { rows.push([...data]); }
        }
        return { ten: String(table?.['@_table:name'] || `Sheet${index + 1}`), thuTu: index + 1, rows };
    });
}

function layMetadataXlsx(zip) {
    const core = docXml(zip, 'docProps/core.xml')?.['cp:coreProperties'] || {};
    const app = docXml(zip, 'docProps/app.xml')?.Properties || {};
    return {
        tieuDe: layGiaTriCore(core['dc:title']),
        tacGia: layGiaTriCore(core['dc:creator']),
        nguoiSuaCuoi: layGiaTriCore(core['cp:lastModifiedBy']),
        chuDe: layGiaTriCore(core['dc:subject']),
        moTa: layGiaTriCore(core['dc:description']),
        ngayTao: layGiaTriCore(core['dcterms:created']),
        ngayCapNhat: layGiaTriCore(core['dcterms:modified']),
        ungDung: layGiaTriCore(app.Application)
    };
}

function layMetadataOds(zip) {
    const meta = docXml(zip, 'meta.xml')?.['office:document-meta']?.['office:meta'] || {};
    return {
        tieuDe: layGiaTriCore(meta['dc:title']),
        tacGia: layGiaTriCore(meta['dc:creator']) || layGiaTriCore(meta['meta:initial-creator']),
        nguoiSuaCuoi: layGiaTriCore(meta['dc:creator']),
        chuDe: layGiaTriCore(meta['dc:subject']),
        moTa: layGiaTriCore(meta['dc:description']),
        ngayTao: layGiaTriCore(meta['meta:creation-date']),
        ngayCapNhat: layGiaTriCore(meta['dc:date']),
        ungDung: layGiaTriCore(meta['meta:generator'])
    };
}

async function layMetadata(buffer, dinhDangDuKien = null) {
    const data = batBuocBuffer(buffer);
    const dinhDang = nhanDienDinhDang(data);
    if (!dinhDang) { throw taoLoi(415, 'Tệp không phải XLS, XLSX hoặc ODS hợp lệ.', MA_LOI.TEP_DINH_DANG_KHONG_HO_TRO); }
    if (dinhDangDuKien && String(dinhDangDuKien).trim().toLowerCase() !== dinhDang) { throw taoLoi(422, `Định dạng thực tế "${dinhDang}" không khớp định dạng dự kiến "${dinhDangDuKien}".`, MA_LOI.TEP_KHONG_HOP_LE); }
    const zip = dinhDang === DINH_DANG.XLS ? null : moZip(data);
    const metadata = dinhDang === DINH_DANG.XLSX ? layMetadataXlsx(zip) : dinhDang === DINH_DANG.ODS ? layMetadataOds(zip) : {};
    return { dinhDang, kichThuocBytes: data.length, mimeType: dinhDang === DINH_DANG.XLS ? 'application/vnd.ms-excel' : dinhDang === DINH_DANG.XLSX ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/vnd.oasis.opendocument.spreadsheet', ...metadata };
}

async function docBangTinh(buffer, dinhDangDuKien = null, options = {}) {
    const data = batBuocBuffer(buffer);
    const metadata = await layMetadata(data, dinhDangDuKien);
    if (metadata.dinhDang === DINH_DANG.XLS) { throw taoLoi(422, 'XLS cần được chuẩn hóa sang XLSX trước khi đọc dữ liệu.', MA_LOI.TEP_KHONG_HOP_LE); }
    const zip = moZip(data);
    const sheets = metadata.dinhDang === DINH_DANG.XLSX ? layDanhSachSheetXlsx(zip, options) : layDanhSachSheetOds(zip, options);
    return { dinhDang: metadata.dinhDang, metadata: { ...metadata, soSheet: sheets.length }, sheets };
}

module.exports = {
    DINH_DANG_EXCEL,
    laXls,
    laXlsx,
    laOds,
    nhanDienDinhDang,
    layMetadata,
    docBangTinh
};