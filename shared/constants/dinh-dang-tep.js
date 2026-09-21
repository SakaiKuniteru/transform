'use strict';

const NHOM_DINH_DANG = Object.freeze({
    TAI_LIEU: 'TAI_LIEU',
    DU_LIEU: 'DU_LIEU',
    VAN_BAN: 'VAN_BAN',
    MA_HOA: 'MA_HOA',
    TEP_NEN: 'TEP_NEN',
    HINH_ANH: 'HINH_ANH',
    KHAC: 'KHAC'
});

const DINH_DANG = Object.freeze({
    /*
     * =========================================================
     * TÀI LIỆU
     * =========================================================
     */
    PDF: 'pdf',
    DOC: 'doc',
    DOCX: 'docx',
    XLS: 'xls',
    XLSX: 'xlsx',
    PPT: 'ppt',
    PPTX: 'pptx',
    ODT: 'odt',
    ODS: 'ods',
    ODP: 'odp',
    RTF: 'rtf',

    /*
     * =========================================================
     * VĂN BẢN
     * =========================================================
     */
    TXT: 'txt',
    HTML: 'html',
    HTM: 'htm',
    MARKDOWN: 'md',
    LATEX: 'tex',

    /*
     * =========================================================
     * DỮ LIỆU
     * =========================================================
     */
    JSON: 'json',
    XML: 'xml',
    YAML: 'yaml',
    YML: 'yml',
    CSV: 'csv',
    TSV: 'tsv',
    TOML: 'toml',
    INI: 'ini',
    SQL: 'sql',

    /*
     * =========================================================
     * MÃ HÓA
     * =========================================================
     */
    BASE64: 'base64',
    BASE32: 'base32',
    HEX: 'hex',

    /*
     * =========================================================
     * TỆP NÉN
     * =========================================================
     */
    ZIP: 'zip',
    GZIP: 'gz',
    TAR: 'tar',
    TGZ: 'tgz',
    BZ2: 'bz2',
    XZ: 'xz',
    SEVEN_ZIP: '7z',

    /*
     * =========================================================
     * HÌNH ẢNH
     * =========================================================
     */
    PNG: 'png',
    JPG: 'jpg',
    JPEG: 'jpeg',
    WEBP: 'webp',
    GIF: 'gif',
    BMP: 'bmp',
    TIFF: 'tiff',
    TIF: 'tif',
    SVG: 'svg',
    AVIF: 'avif'
});

const THONG_TIN_DINH_DANG = Object.freeze({
    /*
     * =========================================================
     * TÀI LIỆU
     * =========================================================
     */
    [DINH_DANG.PDF]: { ma: DINH_DANG.PDF, ten: 'PDF', nhom: NHOM_DINH_DANG.TAI_LIEU, extensions: ['pdf'], mimeTypes: ['application/pdf'], binary: true, preview: true },
    [DINH_DANG.DOC]: { ma: DINH_DANG.DOC, ten: 'Microsoft Word 97-2003', nhom: NHOM_DINH_DANG.TAI_LIEU, extensions: ['doc'], mimeTypes: ['application/msword'], binary: true, preview: false },
    [DINH_DANG.DOCX]: { ma: DINH_DANG.DOCX, ten: 'Microsoft Word', nhom: NHOM_DINH_DANG.TAI_LIEU, extensions: ['docx'], mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'], binary: true, preview: false },
    [DINH_DANG.XLS]: { ma: DINH_DANG.XLS, ten: 'Microsoft Excel 97-2003', nhom: NHOM_DINH_DANG.TAI_LIEU, extensions: ['xls'], mimeTypes: ['application/vnd.ms-excel'], binary: true, preview: false },
    [DINH_DANG.XLSX]: { ma: DINH_DANG.XLSX, ten: 'Microsoft Excel', nhom: NHOM_DINH_DANG.TAI_LIEU, extensions: ['xlsx'], mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], binary: true, preview: false },
    [DINH_DANG.PPT]: { ma: DINH_DANG.PPT, ten: 'Microsoft PowerPoint 97-2003', nhom: NHOM_DINH_DANG.TAI_LIEU, extensions: ['ppt'], mimeTypes: ['application/vnd.ms-powerpoint'], binary: true, preview: false },
    [DINH_DANG.PPTX]: { ma: DINH_DANG.PPTX, ten: 'Microsoft PowerPoint', nhom: NHOM_DINH_DANG.TAI_LIEU, extensions: ['pptx'], mimeTypes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'], binary: true, preview: false },
    [DINH_DANG.ODT]: { ma: DINH_DANG.ODT, ten: 'OpenDocument Text', nhom: NHOM_DINH_DANG.TAI_LIEU, extensions: ['odt'], mimeTypes: ['application/vnd.oasis.opendocument.text'], binary: true, preview: false },
    [DINH_DANG.ODS]: { ma: DINH_DANG.ODS, ten: 'OpenDocument Spreadsheet', nhom: NHOM_DINH_DANG.TAI_LIEU, extensions: ['ods'], mimeTypes: ['application/vnd.oasis.opendocument.spreadsheet'], binary: true, preview: false },
    [DINH_DANG.ODP]: { ma: DINH_DANG.ODP, ten: 'OpenDocument Presentation', nhom: NHOM_DINH_DANG.TAI_LIEU, extensions: ['odp'], mimeTypes: ['application/vnd.oasis.opendocument.presentation'], binary: true, preview: false },
    [DINH_DANG.RTF]: { ma: DINH_DANG.RTF, ten: 'Rich Text Format', nhom: NHOM_DINH_DANG.TAI_LIEU, extensions: ['rtf'], mimeTypes: ['application/rtf', 'text/rtf'], binary: false, preview: true },

    /*
     * =========================================================
     * VĂN BẢN
     * =========================================================
     */
    [DINH_DANG.TXT]: { ma: DINH_DANG.TXT, ten: 'Text', nhom: NHOM_DINH_DANG.VAN_BAN, extensions: ['txt'], mimeTypes: ['text/plain'], binary: false, preview: true },
    [DINH_DANG.HTML]: { ma: DINH_DANG.HTML, ten: 'HTML', nhom: NHOM_DINH_DANG.VAN_BAN, extensions: ['html'], mimeTypes: ['text/html'], binary: false, preview: true },
    [DINH_DANG.HTM]: { ma: DINH_DANG.HTM, ten: 'HTML', nhom: NHOM_DINH_DANG.VAN_BAN, extensions: ['htm'], mimeTypes: ['text/html'], binary: false, preview: true },
    [DINH_DANG.MARKDOWN]: { ma: DINH_DANG.MARKDOWN, ten: 'Markdown', nhom: NHOM_DINH_DANG.VAN_BAN, extensions: ['md', 'markdown'], mimeTypes: ['text/markdown', 'text/plain'], binary: false, preview: true },
    [DINH_DANG.LATEX]: { ma: DINH_DANG.LATEX, ten: 'LaTeX', nhom: NHOM_DINH_DANG.VAN_BAN, extensions: ['tex'], mimeTypes: ['application/x-tex', 'text/plain'], binary: false, preview: true },

    /*
     * =========================================================
     * DỮ LIỆU
     * =========================================================
     */
    [DINH_DANG.JSON]: { ma: DINH_DANG.JSON, ten: 'JSON', nhom: NHOM_DINH_DANG.DU_LIEU, extensions: ['json'], mimeTypes: ['application/json'], binary: false, preview: true },
    [DINH_DANG.XML]: { ma: DINH_DANG.XML, ten: 'XML', nhom: NHOM_DINH_DANG.DU_LIEU, extensions: ['xml'], mimeTypes: ['application/xml', 'text/xml'], binary: false, preview: true },
    [DINH_DANG.YAML]: { ma: DINH_DANG.YAML, ten: 'YAML', nhom: NHOM_DINH_DANG.DU_LIEU, extensions: ['yaml'], mimeTypes: ['application/yaml', 'text/yaml', 'text/x-yaml'], binary: false, preview: true },
    [DINH_DANG.YML]: { ma: DINH_DANG.YML, ten: 'YAML', nhom: NHOM_DINH_DANG.DU_LIEU, extensions: ['yml'], mimeTypes: ['application/yaml', 'text/yaml', 'text/x-yaml'], binary: false, preview: true },
    [DINH_DANG.CSV]: { ma: DINH_DANG.CSV, ten: 'CSV', nhom: NHOM_DINH_DANG.DU_LIEU, extensions: ['csv'], mimeTypes: ['text/csv'], binary: false, preview: true },
    [DINH_DANG.TSV]: { ma: DINH_DANG.TSV, ten: 'TSV', nhom: NHOM_DINH_DANG.DU_LIEU, extensions: ['tsv'], mimeTypes: ['text/tab-separated-values'], binary: false, preview: true },
    [DINH_DANG.TOML]: { ma: DINH_DANG.TOML, ten: 'TOML', nhom: NHOM_DINH_DANG.DU_LIEU, extensions: ['toml'], mimeTypes: ['application/toml', 'text/plain'], binary: false, preview: true },
    [DINH_DANG.INI]: { ma: DINH_DANG.INI, ten: 'INI', nhom: NHOM_DINH_DANG.DU_LIEU, extensions: ['ini'], mimeTypes: ['text/plain'], binary: false, preview: true },
    [DINH_DANG.SQL]: { ma: DINH_DANG.SQL, ten: 'SQL', nhom: NHOM_DINH_DANG.DU_LIEU, extensions: ['sql'], mimeTypes: ['application/sql', 'text/plain'], binary: false, preview: true },

    /*
     * =========================================================
     * TỆP NÉN
     * =========================================================
     */
    [DINH_DANG.ZIP]: { ma: DINH_DANG.ZIP, ten: 'ZIP', nhom: NHOM_DINH_DANG.TEP_NEN, extensions: ['zip'], mimeTypes: ['application/zip'], binary: true, preview: false },
    [DINH_DANG.GZIP]: { ma: DINH_DANG.GZIP, ten: 'GZIP', nhom: NHOM_DINH_DANG.TEP_NEN, extensions: ['gz', 'gzip'], mimeTypes: ['application/gzip'], binary: true, preview: false },
    [DINH_DANG.TAR]: { ma: DINH_DANG.TAR, ten: 'TAR', nhom: NHOM_DINH_DANG.TEP_NEN, extensions: ['tar'], mimeTypes: ['application/x-tar'], binary: true, preview: false },
    [DINH_DANG.TGZ]: { ma: DINH_DANG.TGZ, ten: 'TAR.GZ', nhom: NHOM_DINH_DANG.TEP_NEN, extensions: ['tgz'], mimeTypes: ['application/gzip'], binary: true, preview: false },
    [DINH_DANG.BZ2]: { ma: DINH_DANG.BZ2, ten: 'BZIP2', nhom: NHOM_DINH_DANG.TEP_NEN, extensions: ['bz2'], mimeTypes: ['application/x-bzip2'], binary: true, preview: false },
    [DINH_DANG.XZ]: { ma: DINH_DANG.XZ, ten: 'XZ', nhom: NHOM_DINH_DANG.TEP_NEN, extensions: ['xz'], mimeTypes: ['application/x-xz'], binary: true, preview: false },
    [DINH_DANG.SEVEN_ZIP]: { ma: DINH_DANG.SEVEN_ZIP, ten: '7-Zip', nhom: NHOM_DINH_DANG.TEP_NEN, extensions: ['7z'], mimeTypes: ['application/x-7z-compressed'], binary: true, preview: false },

    /*
     * =========================================================
     * MÃ HÓA
     * =========================================================
     */
    [DINH_DANG.BASE64]: { ma: DINH_DANG.BASE64, ten: 'Base64', nhom: NHOM_DINH_DANG.MA_HOA, extensions: ['base64', 'b64'], mimeTypes: ['text/plain'], binary: false, preview: true },
    [DINH_DANG.BASE32]: { ma: DINH_DANG.BASE32, ten: 'Base32', nhom: NHOM_DINH_DANG.MA_HOA, extensions: ['base32', 'b32'], mimeTypes: ['text/plain'], binary: false, preview: true },
    [DINH_DANG.HEX]: { ma: DINH_DANG.HEX, ten: 'Hexadecimal', nhom: NHOM_DINH_DANG.MA_HOA, extensions: ['hex'], mimeTypes: ['text/plain'], binary: false, preview: true },

    /*
     * =========================================================
     * HÌNH ẢNH
     * =========================================================
     */
    [DINH_DANG.PNG]: { 
        ma: DINH_DANG.PNG, 
        ten: 'PNG', 
        nhom: NHOM_DINH_DANG.HINH_ANH, 
        extensions: ['png'], 
        mimeTypes: ['image/png'], 
        binary: true, 
        preview: true 
    },
    [DINH_DANG.JPG]: { ma: DINH_DANG.JPG, ten: 'JPEG', nhom: NHOM_DINH_DANG.HINH_ANH, extensions: ['jpg'], mimeTypes: ['image/jpeg'], binary: true, preview: true },
    [DINH_DANG.JPEG]: { ma: DINH_DANG.JPEG, ten: 'JPEG', nhom: NHOM_DINH_DANG.HINH_ANH, extensions: ['jpeg'], mimeTypes: ['image/jpeg'], binary: true, preview: true },
    [DINH_DANG.WEBP]: { ma: DINH_DANG.WEBP, ten: 'WebP', nhom: NHOM_DINH_DANG.HINH_ANH, extensions: ['webp'], mimeTypes: ['image/webp'], binary: true, preview: true },
    [DINH_DANG.GIF]: { ma: DINH_DANG.GIF, ten: 'GIF', nhom: NHOM_DINH_DANG.HINH_ANH, extensions: ['gif'], mimeTypes: ['image/gif'], binary: true, preview: true },
    [DINH_DANG.BMP]: { ma: DINH_DANG.BMP, ten: 'BMP', nhom: NHOM_DINH_DANG.HINH_ANH, extensions: ['bmp'], mimeTypes: ['image/bmp'], binary: true, preview: true },
    [DINH_DANG.TIFF]: { ma: DINH_DANG.TIFF, ten: 'TIFF', nhom: NHOM_DINH_DANG.HINH_ANH, extensions: ['tiff'], mimeTypes: ['image/tiff'], binary: true, preview: true },
    [DINH_DANG.TIF]: { ma: DINH_DANG.TIF, ten: 'TIFF', nhom: NHOM_DINH_DANG.HINH_ANH, extensions: ['tif'], mimeTypes: ['image/tiff'], binary: true, preview: true },
    [DINH_DANG.SVG]: { ma: DINH_DANG.SVG, ten: 'SVG', nhom: NHOM_DINH_DANG.HINH_ANH, extensions: ['svg'], mimeTypes: ['image/svg+xml'], binary: false, preview: true },
    [DINH_DANG.AVIF]: { ma: DINH_DANG.AVIF, ten: 'AVIF', nhom: NHOM_DINH_DANG.HINH_ANH, extensions: ['avif'], mimeTypes: ['image/avif'], binary: true, preview: true }
});

function chuanHoaDinhDang(value) {
    if (value === null || value === undefined) {
        return null;
    }

    const dinhDang = String(value).trim().toLowerCase().replace(/^\./, '');

    return dinhDang || null;
}

function coDinhDang(value) {
    const dinhDang = chuanHoaDinhDang(value);

    return Boolean(dinhDang && THONG_TIN_DINH_DANG[dinhDang]);
}

function layThongTinDinhDang(value) {
    const dinhDang = chuanHoaDinhDang(value);

    if (!dinhDang) {
        return null;
    }

    return THONG_TIN_DINH_DANG[dinhDang] || null;
}

function layDanhSachDinhDang() {
    return Object.values(THONG_TIN_DINH_DANG);
}

function layTheoNhom(nhom) {
    return layDanhSachDinhDang().filter((item) => item.nhom === nhom);
}

module.exports = {
    NHOM_DINH_DANG,
    DINH_DANG,
    THONG_TIN_DINH_DANG,
    chuanHoaDinhDang,
    coDinhDang,
    layThongTinDinhDang,
    layDanhSachDinhDang,
    layTheoNhom
};