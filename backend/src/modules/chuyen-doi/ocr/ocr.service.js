'use strict';

const MA_LOI = require('../../../constants/ma-loi');
const { taoLoiTheoStatus: taoLoi } = require('../../../utils/loi');
const tesseractProvider = require('./tesseract.provider');

const providers = new Map([[tesseractProvider.ma, tesseractProvider]]);
const PROVIDER_MAC_DINH = tesseractProvider.ma;

function layProvider(ma = PROVIDER_MAC_DINH) {
    const key = String(ma || PROVIDER_MAC_DINH).trim().toLowerCase();
    const provider = providers.get(key) || null;
    if (!provider) { throw taoLoi(422, `OCR provider "${ma}" không được hỗ trợ.`, MA_LOI.OCR_KHONG_HO_TRO); }
    return provider;
}

function layDanhSachProvider() {
    return Array.from(providers.values());
}

async function kiemTraSanSang(ma = PROVIDER_MAC_DINH) {
    return layProvider(ma).kiemTra();
}

async function nhanDang(input = {}) {
    if (!Buffer.isBuffer(input.buffer) || !input.buffer.length) { throw taoLoi(422, 'Dữ liệu OCR không hợp lệ.', MA_LOI.OCR_THAT_BAI); }
    const provider = layProvider(input.provider);
    try {
        const ketQua = await provider.nhanDang(input);
        return { ...ketQua, provider: provider.ma };
    } catch (error) {
        if (error?.maLoi || error?.statusCode) { throw error; }
        throw taoLoi(500, 'OCR thất bại.', MA_LOI.OCR_THAT_BAI, error);
    }
}

module.exports = {
    PROVIDER_MAC_DINH,
    layProvider,
    layDanhSachProvider,
    kiemTraSanSang,
    nhanDang
};