'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const MA_LOI = require('../../src/constants/ma-loi');
const { DINH_DANG } = require('../../src/constants/dinh-dang-tep');
const { LOAI_CHUYEN_DOI, DANH_SACH_LOAI_CHUYEN_DOI_HO_TRO } = require('../../src/constants/loai-chuyen-doi');
const { taoSchema } = require('../../src/modules/chuyen-doi/chuyen-doi.validation');
const chuyenDoiService = require('../../src/modules/chuyen-doi/chuyen-doi.service');
const registry = require('../../src/modules/chuyen-doi/engine/converter-registry');
const planner = require('../../src/modules/chuyen-doi/engine/conversion-planner');
const { taoTransformContext } = require('../../src/modules/chuyen-doi/engine/transform-context');
const jsonConverter = require('../../src/modules/chuyen-doi/du-lieu/json/json.converter');

const LOAI_CHUA_HO_TRO = Object.freeze([
    LOAI_CHUYEN_DOI.GOP,
    LOAI_CHUYEN_DOI.SO_SANH,
    LOAI_CHUYEN_DOI.NHAN_DIEN_NGON_NGU
]);

const CONVERTER_BAT_BUOC = Object.freeze([
    'sharp:chuyen-dinh-dang-hinh-anh',
    'sharp:doi-kich-thuoc',
    'sharp:toi-uu-hinh-anh',
    'sharp:xoay-hinh-anh',
    'sharp:cat-hinh-anh',
    'poppler:pdf-to-text',
    'poppler:pdf-to-image',
    'pdf-lib:image-to-pdf',
    'ghostscript:chuan-hoa-pdf',
    'pdf-lib:tach-pdf',
    'word:chuyen-dinh-dang',
    'excel:chuyen-dinh-dang',
    'powerpoint:chuyen-dinh-dang',
    'json:chuyen-dinh-dang',
    'dich:text',
    'ai:text-transform',
    'gzip:nen',
    'gzip:giai-nen',
    'base64:ma-hoa',
    'base64:giai-ma',
    'trich-xuat:noi-dung',
    'tesseract:ocr-image'
]);

function kiemTraKeHoach(keHoach, converterKey) {
    assert.equal(keHoach.trucTiep, true);
    assert.equal(keHoach.cacBuoc.length, 1);
    assert.equal(keHoach.cacBuoc[0].converterKey, converterKey);
}

test('Registry có đủ converter core và contract hợp lệ', () => {
    const danhSach = registry.layDanhSachConverter();
    const keys = danhSach.map((item) => item.key);
    assert.equal(new Set(keys).size, keys.length);
    for (const key of CONVERTER_BAT_BUOC) { assert.ok(keys.includes(key), `Thiếu converter "${key}".`); }
    for (const converter of danhSach) {
        assert.ok(converter.key);
        assert.ok(Array.isArray(converter.loaiChuyenDoi) && converter.loaiChuyenDoi.length);
        assert.ok(Array.isArray(converter.nhomXuLy) && converter.nhomXuLy.length);
        assert.ok(Array.isArray(converter.dinhDangNguon) && converter.dinhDangNguon.length);
        assert.ok(Array.isArray(converter.dinhDangDich) && converter.dinhDangDich.length);
        assert.equal(typeof converter.xuLy, 'function');
    }
});

test('GOP, SO_SANH và NHAN_DIEN_NGON_NGU chưa được public hoặc đăng ký converter', async () => {
    const danhSach = registry.layDanhSachConverter();
    for (const loai of LOAI_CHUA_HO_TRO) {
        assert.equal(DANH_SACH_LOAI_CHUYEN_DOI_HO_TRO.includes(loai), false);
        assert.equal(danhSach.some((converter) => converter.loaiChuyenDoi.includes(loai)), false);
        const { error } = taoSchema.validate({ tepNguonId: 1, loaiChuyenDoi: loai, dinhDangDich: DINH_DANG.TXT });
        assert.ok(error);
        await assert.rejects(() => chuyenDoiService.getHoTro({ loaiChuyenDoi: loai }), (loi) => loi?.maLoi === MA_LOI.CHUYEN_DOI_KHONG_HO_TRO);
    }
});

test('JSON converter đăng ký idempotent', () => {
    assert.equal(typeof jsonConverter.dangKyTatCa, 'function');
    const truoc = registry.layDanhSachConverter().length;
    jsonConverter.dangKyTatCa();
    jsonConverter.dangKyTatCa();
    assert.equal(registry.layDanhSachConverter().length, truoc);
    assert.ok(registry.layConverter('json:chuyen-dinh-dang'));
});

test('JSON converter parse và format JSON sang YAML', async () => {
    const ketQua = await jsonConverter.xuLy({
        dauVao: { buffer: Buffer.from('{"b":2,"a":1}', 'utf8') },
        dinhDangDich: DINH_DANG.YAML,
        tuyChon: {},
        thuTuBuoc: 1,
        tongSoBuoc: 2,
        kiemTraHuy: async () => null,
        capNhatTienTrinh: async () => null
    });
    assert.equal(ketQua.dinhDangDich, DINH_DANG.YAML);
    assert.ok(Buffer.isBuffer(ketQua.dauRa?.buffer));
    assert.match(ketQua.dauRa.buffer.toString('utf8'), /a:\s*1/);
    assert.match(ketQua.dauRa.buffer.toString('utf8'), /b:\s*2/);
});

test('JSON converter reject JSON không hợp lệ', async () => {
    await assert.rejects(() => jsonConverter.xuLy({
        dauVao: { buffer: Buffer.from('{"a":', 'utf8') },
        dinhDangDich: DINH_DANG.JSON,
        tuyChon: {},
        thuTuBuoc: 1,
        tongSoBuoc: 2,
        kiemTraHuy: async () => null,
        capNhatTienTrinh: async () => null
    }), (loi) => loi?.maLoi === MA_LOI.DU_LIEU_KHONG_HOP_LE);
});

test('Planner chọn JSON → YAML', async () => {
    const keHoach = await planner.lapKeHoach({ loaiChuyenDoi: LOAI_CHUYEN_DOI.CHUYEN_DINH_DANG, dinhDangNguon: DINH_DANG.JSON, dinhDangDich: DINH_DANG.YAML, tuyChon: {} });
    kiemTraKeHoach(keHoach, 'json:chuyen-dinh-dang');
});

test('Planner chọn PNG → BASE64', async () => {
    const keHoach = await planner.lapKeHoach({ loaiChuyenDoi: LOAI_CHUYEN_DOI.MA_HOA, dinhDangNguon: DINH_DANG.PNG, dinhDangDich: DINH_DANG.BASE64, tuyChon: {} });
    kiemTraKeHoach(keHoach, 'base64:ma-hoa');
});

test('Planner chọn BASE64 → PNG', async () => {
    const keHoach = await planner.lapKeHoach({ loaiChuyenDoi: LOAI_CHUYEN_DOI.GIAI_MA, dinhDangNguon: DINH_DANG.BASE64, dinhDangDich: DINH_DANG.PNG, tuyChon: {} });
    kiemTraKeHoach(keHoach, 'base64:giai-ma');
});

test('Planner chọn PNG → GZIP', async () => {
    const keHoach = await planner.lapKeHoach({ loaiChuyenDoi: LOAI_CHUYEN_DOI.NEN, dinhDangNguon: DINH_DANG.PNG, dinhDangDich: DINH_DANG.GZIP, tuyChon: {} });
    kiemTraKeHoach(keHoach, 'gzip:nen');
});

test('Planner chọn PDF → TXT', async () => {
    const keHoach = await planner.lapKeHoach({ loaiChuyenDoi: LOAI_CHUYEN_DOI.CHUYEN_DINH_DANG, dinhDangNguon: DINH_DANG.PDF, dinhDangDich: DINH_DANG.TXT, tuyChon: {} });
    kiemTraKeHoach(keHoach, 'poppler:pdf-to-text');
});

test('Wildcard không làm converter khác loại nhận nhầm yêu cầu', async () => {
    const maHoaSaiLoai = await registry.timConverter({ loaiChuyenDoi: LOAI_CHUYEN_DOI.CHUYEN_DINH_DANG, dinhDangNguon: DINH_DANG.PNG, dinhDangDich: DINH_DANG.BASE64 });
    const giaiMaSaiNguon = await registry.timConverter({ loaiChuyenDoi: LOAI_CHUYEN_DOI.GIAI_MA, dinhDangNguon: DINH_DANG.PNG, dinhDangDich: DINH_DANG.PDF });
    assert.equal(maHoaSaiLoai.some((item) => item.key === 'base64:ma-hoa'), false);
    assert.equal(giaiMaSaiNguon.some((item) => item.key === 'base64:giai-ma'), false);
});

test('Planner reject combination không có đường chuyển đổi', async () => {
    await assert.rejects(() => planner.lapKeHoach({ loaiChuyenDoi: LOAI_CHUYEN_DOI.CHUYEN_DINH_DANG, dinhDangNguon: DINH_DANG.PDF, dinhDangDich: DINH_DANG.BASE64, tuyChon: {} }), (loi) => loi?.maLoi === MA_LOI.CHUYEN_DOI_KHONG_TIM_THAY_DUONG_DI);
});

test('Worker giữ nhomXuLy nghiệp vụ thay vì ghi đè bằng loại queue', async () => {
    const maHoa = taoTransformContext({ loaiXuLy: 'DU_LIEU', jobData: { loaiChuyenDoi: LOAI_CHUYEN_DOI.MA_HOA, nhomXuLy: 'MA_HOA', dinhDangNguon: DINH_DANG.PNG, dinhDangDich: DINH_DANG.BASE64, converterKey: 'base64:ma-hoa' } });
    const giaiMa = taoTransformContext({ loaiXuLy: 'DU_LIEU', jobData: { loaiChuyenDoi: LOAI_CHUYEN_DOI.GIAI_MA, nhomXuLy: 'MA_HOA', dinhDangNguon: DINH_DANG.BASE64, dinhDangDich: DINH_DANG.PNG, converterKey: 'base64:giai-ma' } });
    const nen = taoTransformContext({ loaiXuLy: 'NEN', jobData: { loaiChuyenDoi: LOAI_CHUYEN_DOI.NEN, nhomXuLy: 'TEP_NEN', dinhDangNguon: DINH_DANG.PNG, dinhDangDich: DINH_DANG.GZIP, converterKey: 'gzip:nen' } });
    assert.equal(maHoa.nhomXuLy, 'MA_HOA');
    assert.equal(giaiMa.nhomXuLy, 'MA_HOA');
    assert.equal(nen.nhomXuLy, 'TEP_NEN');
    kiemTraKeHoach(await planner.lapKeHoach(maHoa), 'base64:ma-hoa');
    kiemTraKeHoach(await planner.lapKeHoach(giaiMa), 'base64:giai-ma');
    kiemTraKeHoach(await planner.lapKeHoach(nen), 'gzip:nen');
});

test('Planner chọn OCR PNG → TXT bằng Tesseract', async () => {
    assert.equal(DANH_SACH_LOAI_CHUYEN_DOI_HO_TRO.includes(LOAI_CHUYEN_DOI.OCR), true);
    const keHoach = await planner.lapKeHoach({
        loaiChuyenDoi: LOAI_CHUYEN_DOI.OCR,
        dinhDangNguon: DINH_DANG.PNG,
        dinhDangDich: DINH_DANG.TXT,
        tuyChon: {}
    });
    kiemTraKeHoach(keHoach, 'tesseract:ocr-image');
});