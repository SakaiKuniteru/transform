'use strict';

const MA_LOI = require('../../../../constants/ma-loi');
const { taoLoiTheoStatus: taoLoi } = require('../../../../utils/loi');
const encodingService = require('../../nhan-dien/encoding.service');
const validator = require('./json.validator');

function docVanBan(value) {
    if (typeof value === 'string') { return value; }
    if (!Buffer.isBuffer(value)) { throw new TypeError('Dữ liệu JSON phải là Buffer hoặc string.'); }
    validator.kiemTraKichThuoc(value);
    const encoding = encodingService.nhanDienEncoding(value);
    if (!encoding.laVanBan || !encoding.encoding) { throw taoLoi(422, 'Dữ liệu JSON không phải văn bản hợp lệ.', MA_LOI.DU_LIEU_KHONG_HOP_LE); }
    try { return encodingService.docVanBan(value, encoding.encoding); } catch (error) { throw taoLoi(422, 'Không thể giải mã nội dung JSON.', MA_LOI.DU_LIEU_KHONG_HOP_LE, null, { encoding: encoding.encoding, cause: error.message }); }
}

function layViTriLoi(text, error) {
    const match = String(error?.message || '').match(/position\s+(\d+)/i);
    if (!match) { return null; }
    const viTri = Number(match[1]);
    const truoc = text.slice(0, viTri);
    const lines = truoc.split(/\r?\n/);
    return { viTri, dong: lines.length, cot: lines[lines.length - 1].length + 1 };
}

function parse(value, options = {}) {
    const text = docVanBan(value);
    validator.kiemTraKichThuoc(text, options);
    let data;
    try { data = JSON.parse(text); } catch (error) {
        throw taoLoi(422, 'Nội dung JSON không hợp lệ.', MA_LOI.DU_LIEU_KHONG_HOP_LE, null, {
            viTri: layViTriLoi(text, error),
            thongBaoGoc: error.message
        });
    }
    const thongKe = validator.kiemTraCauTruc(data, options);
    return { giaTri: data, thongKe, kichThuocBytes: Buffer.byteLength(text, 'utf8') };
}

module.exports = {
    docVanBan,
    layViTriLoi,
    parse
};