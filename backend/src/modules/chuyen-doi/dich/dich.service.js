'use strict';

const env = require('../../../config/env');
const MA_LOI = require('../../../constants/ma-loi');
const { taoLoi } = require('../../../utils/loi');
const providerService = require('./dich-provider');
const ngonNguService = require('./nhan-dien-ngon-ngu.service');
const thuatNguService = require('./bang-thuat-ngu.service');

const MAX_CHUNK_MAC_DINH = 4000;
let daKhoiTaoProviderMacDinh = false;

function khoiTaoProviderMacDinh() {
    if (daKhoiTaoProviderMacDinh) { return; }
    daKhoiTaoProviderMacDinh = true;
    if (!env.tichHop.dich.provider || !env.tichHop.dich.baseUrl) { return; }
    if (!providerService.layProvider(env.tichHop.dich.provider)) { providerService.dangKyProvider(providerService.taoHttpProvider({ ma: env.tichHop.dich.provider }), { thayThe: true }); }
}

function chuanHoaVanBan(value) { if (typeof value !== 'string') { throw new TypeError('Văn bản cần dịch phải là string.'); } if (!value.trim()) { throw taoLoi({ maLoi: MA_LOI.DICH_KHONG_HO_TRO, thongBao: 'Văn bản cần dịch không được để trống.', statusCode: 400, expose: true }); } return value; }

function tachChunk(vanBan, maxChars = MAX_CHUNK_MAC_DINH) {
    const max = Number(maxChars);
    if (!Number.isSafeInteger(max) || max < 200 || max > 50000) { throw new TypeError('maxChars phải là số nguyên từ 200 đến 50000.'); }
    if (vanBan.length <= max) { return [vanBan]; }
    const chunks = [];
    let conLai = vanBan;
    while (conLai.length > max) {
        let index = Math.max(
            conLai.lastIndexOf('\n\n', max),
            conLai.lastIndexOf('\n', max),
            conLai.lastIndexOf('. ', max),
            conLai.lastIndexOf(' ', max)
        );
        if (index < Math.floor(max * 0.5)) { index = max; }
        else if (conLai[index] === '.' && conLai[index + 1] === ' ') { index += 2; }
        else if (conLai[index] === '\n') { index += conLai[index + 1] === '\n' ? 2 : 1; }
        else { index += 1; }
        chunks.push(conLai.slice(0, index));
        conLai = conLai.slice(index);
    }
    if (conLai) { chunks.push(conLai); }
    return chunks;
}

async function dichVanBan(input = {}) {
    khoiTaoProviderMacDinh();
    const vanBan = chuanHoaVanBan(input.vanBan ?? input.text);
    const ngonNguDich = ngonNguService.chuanHoaMaNgonNgu(input.ngonNguDich ?? input.targetLanguage, { choPhepAuto: false, choPhepUnd: false });
    if (!ngonNguDich) { throw taoLoi({ maLoi: MA_LOI.NGON_NGU_KHONG_HO_TRO, thongBao: 'Ngôn ngữ đích là bắt buộc.', statusCode: 400, expose: true }); }
    let ngonNguNguon = ngonNguService.chuanHoaMaNgonNgu(input.ngonNguNguon ?? input.sourceLanguage ?? 'auto');
    if (ngonNguNguon === 'auto') {
        const nhanDien = await ngonNguService.nhanDien(vanBan, {
            provider: input.provider || null,
            batBuocProvider: false,
            signal: input.signal,
            tuyChon: input.tuyChon
        });
        ngonNguNguon = nhanDien.ngonNgu === 'und' ? 'auto' : nhanDien.ngonNgu;
    }
    if (ngonNguNguon !== 'auto' && ngonNguNguon === ngonNguDich && input.choPhepCungNgonNgu !== true) {
        return {
            vanBan,
            ngonNguNguon,
            ngonNguDich,
            provider: null,
            boQua: true,
            thongKe: {
                soChunk: 0,
                soKyTuNguon: vanBan.length,
                soKyTuDich: vanBan.length
            }
        };
    }
    const provider = await providerService.chonProvider(input.provider || null);
    const bangThuatNgu = thuatNguService.chuanHoaBangThuatNgu(input.bangThuatNgu || []);
    const chunks = tachChunk(vanBan, input.maxChars || input.tuyChon?.maxChars || MAX_CHUNK_MAC_DINH);
    const ketQua = [];
    let ngonNguPhatHien = ngonNguNguon;
    for (const chunk of chunks) {
        const baoVe = thuatNguService.baoVeVanBan(chunk, bangThuatNgu);
        const result = await provider.dich({
            vanBan: baoVe.vanBan,
            ngonNguNguon,
            ngonNguDich,
            bangThuatNgu: thuatNguService.taoDanhSachChoProvider(bangThuatNgu),
            tuyChon: {
                ...(input.tuyChon || {}),
                huongDanThuatNgu: thuatNguService.taoHuongDan(bangThuatNgu)
            },
            signal: input.signal
        });
        if (!result || typeof result.vanBan !== 'string') { throw taoLoi({ maLoi: MA_LOI.DICH_THAT_BAI, thongBao: 'Translation provider trả kết quả không hợp lệ.', statusCode: 502, expose: true }); }
        ketQua.push(thuatNguService.phucHoiVanBan(result.vanBan, baoVe.placeholders));
        if (result.ngonNguNguon) { ngonNguPhatHien = ngonNguService.chuanHoaMaNgonNgu(result.ngonNguNguon, { choPhepAuto: true }); }
    }
    const vanBanDich = ketQua.join('');
    return {
        vanBan: vanBanDich,
        ngonNguNguon: ngonNguPhatHien,
        ngonNguDich,
        provider: provider.ma,
        boQua: false,
        thongKe: {
            soChunk: chunks.length,
            soKyTuNguon: vanBan.length,
            soKyTuDich: vanBanDich.length,
            soThuatNgu: bangThuatNgu.length
        }
    };
}

module.exports = {
    MAX_CHUNK_MAC_DINH,
    khoiTaoProviderMacDinh,
    tachChunk,
    dichVanBan,
    dangKyProvider: providerService.dangKyProvider,
    huyDangKyProvider: providerService.huyDangKyProvider,
    layDanhSachProvider: providerService.layDanhSachProvider
};