'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DINH_DANG } = require('../../../../constants/dinh-dang-tep');
const { LOAI_CHUYEN_DOI } = require('../../../../constants/loai-chuyen-doi');
const MA_LOI = require('../../../../constants/ma-loi');
const { taoLoiTheoStatus: taoLoi } = require('../../../../utils/loi');
const storageService = require('../../../../infrastructure/storage/storage.service');
const processCleanup = require('../../../../infrastructure/process/process-cleanup');
const poppler = require('../../../../infrastructure/process/poppler');
const ghostscript = require('../../../../infrastructure/process/ghostscript');
const transformEngine = require('../../engine/transform-engine.service');
const parser = require('./pdf.parser');
const extractService = require('./pdf.extract');
const renderer = require('./pdf.renderer');
const mergeService = require('./pdf.merge');
const splitService = require('./pdf.split');

const DINH_DANG_ANH = Object.freeze([DINH_DANG.PNG, DINH_DANG.JPG, DINH_DANG.JPEG, DINH_DANG.WEBP]);
const DINH_DANG_RENDER = Object.freeze([DINH_DANG.PNG, DINH_DANG.JPG, DINH_DANG.JPEG]);
const PHIEN_BAN_PDF_LIB = require('pdf-lib/package.json').version;
let popplerAvailablePromise = null;
let ghostscriptAvailablePromise = null;

function layStorageKey(dauVao) { return dauVao?.storageKey || dauVao?.khoa || dauVao?.khoaLuuTru || dauVao?.storage?.khoa || dauVao?.storage?.storageKey || dauVao?.phienBan?.storageKey || dauVao?.phienBanHienTai?.storageKey || null; }

async function docBufferDauVao(dauVao) {
    if (Buffer.isBuffer(dauVao)) { return dauVao; }
    if (Buffer.isBuffer(dauVao?.buffer)) { return dauVao.buffer; }
    const storageKey = layStorageKey(dauVao);
    if (storageKey) { return storageService.docBuffer(storageKey); }
    throw taoLoi(422, 'Không tìm thấy dữ liệu PDF đầu vào.', MA_LOI.TEP_KHONG_THE_DOC);
}

async function docDanhSachBuffer(danhSach) {
    if (!Array.isArray(danhSach) || danhSach.length < 2) { throw taoLoi(400, 'Gộp PDF cần ít nhất 2 tệp đầu vào.', MA_LOI.DU_LIEU_KHONG_HOP_LE); }
    const ketQua = [];
    for (const item of danhSach) { ketQua.push(await docBufferDauVao(item)); }
    return ketQua;
}

function laBuocCuoi(context) {
    const tongSoBuoc = Number(context.tongSoBuoc || 1);
    const thuTuBuoc = Number(context.thuTuBuoc || tongSoBuoc);
    return thuTuBuoc >= tongSoBuoc;
}

function layExtension(dinhDang) {
    if (dinhDang === DINH_DANG.JPEG) { return 'jpg'; }
    return dinhDang || 'bin';
}

function layMimeType(dinhDang) {
    if (dinhDang === DINH_DANG.PDF) { return 'application/pdf'; }
    if (dinhDang === DINH_DANG.TXT) { return 'text/plain; charset=utf-8'; }
    if (dinhDang === DINH_DANG.PNG) { return 'image/png'; }
    if ([DINH_DANG.JPG, DINH_DANG.JPEG].includes(dinhDang)) { return 'image/jpeg'; }
    return 'application/octet-stream';
}

async function taoDauRa(context, ketQua, tenCongCu) {
    const dinhDang = ketQua.dinhDang;
    const mimeType = ketQua.mimeType || layMimeType(dinhDang);
    const thongTin = { dinhDang, mimeType, kichThuocBytes: ketQua.kichThuocBytes || ketQua.buffer.length, metadata: ketQua.metadata || {} };
    if (!laBuocCuoi(context)) { return { ...thongTin, buffer: ketQua.buffer }; }
    const khoa = storageService.taoKhoaLuuTru({ loai: storageService.LOAI_THU_MUC.OUTPUT, tenTep: `ket-qua.${layExtension(dinhDang)}` });
    const storage = await storageService.luuTuBuffer(khoa, ketQua.buffer, {
        contentType: mimeType,
        metadata: {
            congViecId: context.congViecId ? String(context.congViecId) : '',
            buocId: context.buocId ? String(context.buocId) : '',
            dinhDang,
            boXuLy: tenCongCu
        }
    });
    return { ...thongTin, storageKey: storage.khoa, storageDriver: storage.driver, storageBucket: storage.bucket, storageEtag: storage.etag };
}

async function coPoppler() {
    if (!popplerAvailablePromise) { popplerAvailablePromise = poppler.kiemTra().then(() => true).catch(() => false); }
    return popplerAvailablePromise;
}

async function coGhostscript() {
    if (!ghostscriptAvailablePromise) { ghostscriptAvailablePromise = ghostscript.kiemTra().then(() => true).catch(() => false); }
    return ghostscriptAvailablePromise;
}

async function xuLyPdfSangText(context) {
    await context.kiemTraHuy();
    await context.capNhatTienTrinh(5);
    const buffer = await docBufferDauVao(context.dauVao);
    const metadataPdf = await parser.layMetadata(buffer);
    await context.capNhatTienTrinh(20);
    const ketQua = await extractService.trichXuatVanBan(buffer, { ...context.tuyChon, signal: context.signal });
    await context.kiemTraHuy();
    await context.capNhatTienTrinh(90);
    const dauRa = await taoDauRa(context, ketQua, 'pdftotext');
    return { boXuLy: 'TAI_LIEU', congCu: 'pdftotext', phienBanCongCu: null, dauRa, dinhDangDich: DINH_DANG.TXT, thongKe: { soTrangNguon: metadataPdf.soTrang, ...ketQua.thongKe } };
}

async function xuLyPdfSangAnh(context) {
    await context.kiemTraHuy();
    await context.capNhatTienTrinh(5);
    const buffer = await docBufferDauVao(context.dauVao);
    const dinhDang = String(context.dinhDangDich || '').trim().toLowerCase();
    if (!DINH_DANG_RENDER.includes(dinhDang)) { throw taoLoi(415, 'PDF chỉ hỗ trợ render sang PNG hoặc JPEG.', MA_LOI.TEP_DINH_DANG_KHONG_HO_TRO); }
    await context.capNhatTienTrinh(20);
    const ketQua = await renderer.renderTrang(buffer, { ...context.tuyChon, dinhDang, signal: context.signal });
    await context.kiemTraHuy();
    await context.capNhatTienTrinh(90);
    const dauRa = await taoDauRa(context, ketQua, 'pdftoppm');
    return { boXuLy: 'TAI_LIEU', congCu: 'pdftoppm', phienBanCongCu: null, dauRa, dinhDangDich: dinhDang, thongKe: { trang: ketQua.metadata.trang, tongSoTrang: ketQua.metadata.tongSoTrang, dpi: ketQua.metadata.dpi } };
}

async function xuLyAnhSangPdf(context) {
    await context.kiemTraHuy();
    await context.capNhatTienTrinh(5);
    const buffer = await docBufferDauVao(context.dauVao);
    const dinhDangNguon = String(context.dinhDangNguon || '').trim().toLowerCase();
    if (!DINH_DANG_ANH.includes(dinhDangNguon)) { throw taoLoi(415, 'Định dạng ảnh nguồn chưa được hỗ trợ để tạo PDF.', MA_LOI.TEP_DINH_DANG_KHONG_HO_TRO); }
    await context.capNhatTienTrinh(30);
    const ketQua = await renderer.taoPdfTuAnh(buffer, dinhDangNguon, context.tuyChon);
    await context.kiemTraHuy();
    await context.capNhatTienTrinh(90);
    const dauRa = await taoDauRa(context, ketQua, 'pdf-lib');
    return { boXuLy: 'HINH_ANH', congCu: 'pdf-lib', phienBanCongCu: PHIEN_BAN_PDF_LIB, dauRa, dinhDangDich: DINH_DANG.PDF, thongKe: { soTrang: 1, ...ketQua.metadata } };
}

async function xuLyChuanHoaPdf(context) {
    await context.kiemTraHuy();
    await context.capNhatTienTrinh(5);
    const buffer = await docBufferDauVao(context.dauVao);
    const metadataNguon = await parser.layMetadata(buffer);
    const thuMuc = await processCleanup.taoThuMucTam('pdf-gs-');
    try {
        const input = path.join(thuMuc, 'input.pdf');
        const output = path.join(thuMuc, 'output.pdf');
        await fs.promises.writeFile(input, buffer);
        await context.capNhatTienTrinh(25);
        const processResult = await ghostscript.toiUuPdf(input, output, { ...context.tuyChon, signal: context.signal });
        await context.kiemTraHuy();
        await context.capNhatTienTrinh(80);
        const outputBuffer = await fs.promises.readFile(output);
        const metadataDich = await parser.layMetadata(outputBuffer);
        const ketQua = { buffer: outputBuffer, dinhDang: DINH_DANG.PDF, mimeType: 'application/pdf', kichThuocBytes: outputBuffer.length, metadata: { soTrang: metadataDich.soTrang, pdfSettings: processResult.pdfSettings, compatibilityLevel: processResult.compatibilityLevel } };
        const dauRa = await taoDauRa(context, ketQua, 'ghostscript');
        return { boXuLy: 'TAI_LIEU', congCu: 'ghostscript', phienBanCongCu: null, dauRa, dinhDangDich: DINH_DANG.PDF, thongKe: { soTrang: metadataDich.soTrang, kichThuocNguonBytes: buffer.length, kichThuocDichBytes: outputBuffer.length, tiLe: buffer.length > 0 ? outputBuffer.length / buffer.length : null, soTrangNguon: metadataNguon.soTrang } };
    } finally { await processCleanup.xoaDuongDanTam(thuMuc); }
}

async function xuLyTachPdf(context) {
    await context.kiemTraHuy();
    await context.capNhatTienTrinh(10);
    const buffer = await docBufferDauVao(context.dauVao);
    const ketQua = await splitService.tachKhoang(buffer, context.tuyChon);
    await context.kiemTraHuy();
    await context.capNhatTienTrinh(90);
    const dauRa = await taoDauRa(context, ketQua, 'pdf-lib');
    return { boXuLy: 'TAI_LIEU', congCu: 'pdf-lib', phienBanCongCu: PHIEN_BAN_PDF_LIB, dauRa, dinhDangDich: DINH_DANG.PDF, thongKe: ketQua.metadata };
}

async function xuLyGopPdf(context) {
    await context.kiemTraHuy();
    const danhSach = context.dauVao?.danhSach || context.danhSachDauVao;
    const danhSachBuffer = await docDanhSachBuffer(danhSach);
    await context.capNhatTienTrinh(25);
    const ketQua = await mergeService.gop(danhSachBuffer, context.tuyChon);
    await context.kiemTraHuy();
    await context.capNhatTienTrinh(90);
    const dauRa = await taoDauRa(context, ketQua, 'pdf-lib');
    return { boXuLy: 'TAI_LIEU', congCu: 'pdf-lib', phienBanCongCu: PHIEN_BAN_PDF_LIB, dauRa, dinhDangDich: DINH_DANG.PDF, thongKe: ketQua.metadata };
}

function dangKyNeuChuaCo(converter) {
    const daCo = transformEngine.layConverter(converter.key);
    if (daCo) { return daCo; }
    return transformEngine.dangKyConverter(converter);
}

function dangKyTatCa() {
    return Object.freeze([
        dangKyNeuChuaCo({
            key: 'poppler:pdf-to-text',
            ten: 'Trích xuất văn bản PDF bằng pdftotext',
            loaiChuyenDoi: LOAI_CHUYEN_DOI.CHUYEN_DINH_DANG,
            nhomXuLy: 'TAI_LIEU',
            dinhDangNguon: DINH_DANG.PDF,
            dinhDangDich: DINH_DANG.TXT,
            uuTien: 100,
            chiPhi: 1,
            engine: 'poppler',
            phienBanEngine: null,
            hoTro: coPoppler,
            xuLy: xuLyPdfSangText
        }),
        dangKyNeuChuaCo({
            key: 'poppler:pdf-to-image',
            ten: 'Render trang PDF thành ảnh bằng pdftoppm',
            loaiChuyenDoi: LOAI_CHUYEN_DOI.CHUYEN_DINH_DANG,
            nhomXuLy: 'TAI_LIEU',
            dinhDangNguon: DINH_DANG.PDF,
            dinhDangDich: DINH_DANG_RENDER,
            uuTien: 100,
            chiPhi: 1.5,
            engine: 'poppler',
            phienBanEngine: null,
            hoTro: coPoppler,
            xuLy: xuLyPdfSangAnh
        }),
        dangKyNeuChuaCo({
            key: 'pdf-lib:image-to-pdf',
            ten: 'Tạo PDF từ hình ảnh bằng pdf-lib',
            loaiChuyenDoi: LOAI_CHUYEN_DOI.CHUYEN_DINH_DANG,
            nhomXuLy: 'HINH_ANH',
            dinhDangNguon: DINH_DANG_ANH,
            dinhDangDich: DINH_DANG.PDF,
            uuTien: 100,
            chiPhi: 1,
            engine: 'pdf-lib',
            phienBanEngine: PHIEN_BAN_PDF_LIB,
            xuLy: xuLyAnhSangPdf
        }),
        dangKyNeuChuaCo({
            key: 'ghostscript:chuan-hoa-pdf',
            ten: 'Chuẩn hóa và tối ưu PDF bằng Ghostscript',
            loaiChuyenDoi: LOAI_CHUYEN_DOI.CHUAN_HOA,
            nhomXuLy: 'TAI_LIEU',
            dinhDangNguon: DINH_DANG.PDF,
            dinhDangDich: DINH_DANG.PDF,
            uuTien: 100,
            chiPhi: 2,
            engine: 'ghostscript',
            phienBanEngine: null,
            hoTro: coGhostscript,
            xuLy: xuLyChuanHoaPdf
        }),
        dangKyNeuChuaCo({
            key: 'pdf-lib:tach-pdf',
            ten: 'Tách khoảng trang PDF bằng pdf-lib',
            loaiChuyenDoi: LOAI_CHUYEN_DOI.TACH,
            nhomXuLy: 'TAI_LIEU',
            dinhDangNguon: DINH_DANG.PDF,
            dinhDangDich: DINH_DANG.PDF,
            uuTien: 100,
            chiPhi: 1,
            engine: 'pdf-lib',
            phienBanEngine: PHIEN_BAN_PDF_LIB,
            xuLy: xuLyTachPdf
        })
    ]);
}

const converters = dangKyTatCa();

module.exports = {
    DINH_DANG_ANH,
    DINH_DANG_RENDER,
    converters,
    dangKyTatCa,
    docBufferDauVao,
    xuLyPdfSangText,
    xuLyPdfSangAnh,
    xuLyAnhSangPdf,
    xuLyChuanHoaPdf,
    xuLyTachPdf,
    xuLyGopPdf
};