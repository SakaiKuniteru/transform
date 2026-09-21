'use strict';

const { parse: parseDelimited } = require('csv-parse/sync');
const { DINH_DANG } = require('../../../constants/dinh-dang-tep');
const MA_LOI = require('../../../constants/ma-loi');
const { taoLoiTheoStatus: taoLoi } = require('../../../utils/loi');
const encodingService = require('../nhan-dien/encoding.service');
const excelParser = require('../tai-lieu/excel/excel.parser');
const excelRenderer = require('../tai-lieu/excel/excel.renderer');
const jsonParser = require('../du-lieu/json/json.parser');

function taoBangTuJson(value, options = {}) {
    if (Array.isArray(value) && value.every((item) => Array.isArray(item))) { return { ten: options.tenBang || 'JSON', rows: value }; }
    if (Array.isArray(value) && value.every((item) => item && typeof item === 'object' && !Array.isArray(item))) {
        const headers = [...new Set(value.flatMap((item) => Object.keys(item)))];
        return { ten: options.tenBang || 'JSON', rows: [headers, ...value.map((item) => headers.map((header) => item[header] ?? null))] };
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) { return { ten: options.tenBang || 'JSON', rows: [['key', 'value'], ...Object.entries(value)] }; }
    return { ten: options.tenBang || 'JSON', rows: [['value'], [value]] };
}

function docDelimited(buffer, delimiter, options = {}) {
    const encoding = encodingService.nhanDienEncoding(buffer);
    if (!encoding.laVanBan || !encoding.encoding) { throw taoLoi(422, 'Dữ liệu bảng không phải văn bản hợp lệ.', MA_LOI.TEP_KHONG_HOP_LE); }
    const text = encodingService.docVanBan(buffer, encoding.encoding);
    const records = parseDelimited(text, {
        delimiter,
        bom: true,
        relax_column_count: options.relaxColumnCount !== false,
        skip_empty_lines: options.skipEmptyLines !== false,
        max_record_size: Number(options.maxRecordSize || 1024 * 1024)
    });
    const maxRows = Number(options.maxRows || 100000);
    if (records.length > maxRows) { throw new RangeError(`Bảng vượt giới hạn ${maxRows} dòng.`); }
    return { ten: options.tenBang || (delimiter === '\t' ? 'TSV' : 'CSV'), rows: records };
}

async function trichXuat(buffer, dinhDangNguon, options = {}) {
    if (!Buffer.isBuffer(buffer)) { throw new TypeError('Dữ liệu trích xuất bảng phải là Buffer.'); }
    const dinhDang = String(dinhDangNguon || '').trim().toLowerCase();
    let sheets;
    let congCu;
    if ([DINH_DANG.XLS, DINH_DANG.XLSX, DINH_DANG.ODS].includes(dinhDang)) {
        const workbook = await excelRenderer.chuanBiWorkbook(buffer, dinhDang, options);
        const data = await excelParser.docBangTinh(workbook.buffer, workbook.dinhDang, options);
        sheets = data.sheets.map((item) => ({ ten: item.ten, thuTu: item.thuTu, rows: item.rows }));
        congCu = workbook.thoiGianLibreOfficeMs > 0 ? 'libreoffice+transform-excel-parser' : 'transform-excel-parser';
    } else if (dinhDang === DINH_DANG.CSV) {
        sheets = [docDelimited(buffer, options.delimiter || ',', options)];
        congCu = 'csv-parse';
    } else if (dinhDang === DINH_DANG.TSV) {
        sheets = [docDelimited(buffer, '\t', options)];
        congCu = 'csv-parse';
    } else if (dinhDang === DINH_DANG.JSON) {
        const data = jsonParser.parse(buffer, options);
        sheets = [taoBangTuJson(data.giaTri, options)];
        congCu = 'transform-json';
    } else {
        throw taoLoi(415, `Chưa hỗ trợ trích xuất bảng từ "${dinhDang || 'không xác định'}".`, MA_LOI.TEP_DINH_DANG_KHONG_HO_TRO);
    }
    return {
        sheets,
        soBang: sheets.length,
        congCu,
        thongKe: {
            soBang: sheets.length,
            tongSoDong: sheets.reduce((tong, item) => tong + item.rows.length, 0)
        }
    };
}

module.exports = {
    taoBangTuJson,
    docDelimited,
    trichXuat
};