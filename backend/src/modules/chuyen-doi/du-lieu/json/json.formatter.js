'use strict';

const YAML = require('yaml');
const { XMLBuilder } = require('fast-xml-parser');
const { DINH_DANG } = require('../../../../constants/dinh-dang-tep');
const validator = require('./json.validator');

function sapXepKhoa(value) {
    if (Array.isArray(value)) { return value.map(sapXepKhoa); }
    if (!value || typeof value !== 'object') { return value; }
    return Object.fromEntries(Object.keys(value).sort((a, b) => a.localeCompare(b)).map((key) => [key, sapXepKhoa(value[key])]));
}

function formatJson(value, options = {}) {
    validator.kiemTraCauTruc(value, options);
    const data = options.sapXepKhoa === true ? sapXepKhoa(value) : value;
    const indent = options.minify === true ? 0 : Number(options.indent ?? 2);
    if (!Number.isSafeInteger(indent) || indent < 0 || indent > 10) { throw new TypeError('JSON indent phải nằm trong khoảng 0-10.'); }
    let text = JSON.stringify(data, null, indent);
    if (options.newlineCuoi === true) { text += '\n'; }
    return text;
}

function formatYaml(value, options = {}) {
    validator.kiemTraCauTruc(value, options);
    const data = options.sapXepKhoa === true ? sapXepKhoa(value) : value;
    const indent = Number(options.indent ?? 2);
    if (!Number.isSafeInteger(indent) || indent < 1 || indent > 10) { throw new TypeError('YAML indent phải nằm trong khoảng 1-10.'); }
    return YAML.stringify(data, null, { indent, lineWidth: Number(options.lineWidth || 0) || 0 });
}

function taoXmlNode(value) {
    if (value === null) { return { '@_type': 'null' }; }
    if (Array.isArray(value)) { return { '@_type': 'array', item: value.map(taoXmlNode) }; }
    if (typeof value === 'object') { return { '@_type': 'object', entry: Object.entries(value).map(([key, item]) => ({ '@_key': key, ...taoXmlNode(item) })) }; }
    return { '@_type': typeof value, '#text': String(value) };
}

function formatXml(value, options = {}) {
    validator.kiemTraCauTruc(value, options);
    const builder = new XMLBuilder({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        format: options.minify !== true,
        indentBy: ' '.repeat(Number(options.indent ?? 2)),
        suppressEmptyNode: false
    });
    const body = builder.build({ json: taoXmlNode(value) });
    return options.boKhaiBaoXml === true ? body : `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;
}

function escapeCsv(value, delimiter) {
    if (value === null || value === undefined) { return ''; }
    const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
    return text.includes(delimiter) || /["\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function chuanHoaBang(value) {
    if (!Array.isArray(value)) {
        if (value && typeof value === 'object') { return [['key', 'value'], ...Object.entries(value).map(([key, item]) => [key, item])]; }
        return [['value'], [value]];
    }
    if (!value.length) { return []; }
    if (value.every((item) => Array.isArray(item))) { return value; }
    if (value.every((item) => item && typeof item === 'object' && !Array.isArray(item))) {
        const headers = [...new Set(value.flatMap((item) => Object.keys(item)))];
        return [headers, ...value.map((item) => headers.map((header) => item[header] ?? null))];
    }
    return [['value'], ...value.map((item) => [item])];
}

function formatCsv(value, options = {}) {
    validator.kiemTraCauTruc(value, options);
    const delimiter = options.delimiter === undefined ? ',' : String(options.delimiter);
    if (delimiter.length !== 1 || /["\r\n]/.test(delimiter)) { throw new TypeError('CSV delimiter phải là một ký tự hợp lệ.'); }
    const lineEnding = options.lineEnding === 'CRLF' ? '\r\n' : '\n';
    const rows = chuanHoaBang(value);
    const text = rows.map((row) => row.map((item) => escapeCsv(item, delimiter)).join(delimiter)).join(lineEnding);
    return `${options.bom === true ? '\uFEFF' : ''}${text}${text && options.newlineCuoi !== false ? lineEnding : ''}`;
}

function format(value, dinhDangDich, options = {}) {
    const dinhDang = String(dinhDangDich || '').trim().toLowerCase();
    let text;
    let mimeType;
    if (dinhDang === DINH_DANG.JSON) { text = formatJson(value, options); mimeType = 'application/json; charset=utf-8'; }
    else if ([DINH_DANG.YAML, DINH_DANG.YML].includes(dinhDang)) { text = formatYaml(value, options); mimeType = 'application/yaml; charset=utf-8'; }
    else if (dinhDang === DINH_DANG.XML) { text = formatXml(value, options); mimeType = 'application/xml; charset=utf-8'; }
    else if (dinhDang === DINH_DANG.CSV) { text = formatCsv(value, options); mimeType = 'text/csv; charset=utf-8'; }
    else { throw new TypeError(`JSON formatter chưa hỗ trợ định dạng "${dinhDang}".`); }
    const buffer = Buffer.from(text, 'utf8');
    return { buffer, text, dinhDang, mimeType, kichThuocBytes: buffer.length };
}

module.exports = {
    sapXepKhoa,
    formatJson,
    formatYaml,
    formatXml,
    formatCsv,
    format
};