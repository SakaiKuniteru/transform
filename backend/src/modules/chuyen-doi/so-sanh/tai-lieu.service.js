'use strict';

const { DINH_DANG } = require('../../../constants/dinh-dang-tep');
const vanBanService = require('./van-ban.service');
const duLieuService = require('./du-lieu.service');
const trichVanBanService = require('../trich-xuat/van-ban.service');
const trichBangService = require('../trich-xuat/bang.service');
const metadataService = require('../trich-xuat/metadata.service');

const DINH_DANG_BANG = Object.freeze([DINH_DANG.XLS, DINH_DANG.XLSX, DINH_DANG.ODS, DINH_DANG.CSV, DINH_DANG.TSV, DINH_DANG.JSON]);

function chuanHoaNguon(value, ten) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) { throw new TypeError(`${ten} phải là object.`); }
    if (!Buffer.isBuffer(value.buffer)) { throw new TypeError(`${ten}.buffer phải là Buffer.`); }
    return {
        buffer: value.buffer,
        dinhDang: value.dinhDang ? String(value.dinhDang).trim().toLowerCase() : null,
        tenTep: value.tenTep || '',
        mimeType: value.mimeType || 'application/octet-stream'
    };
}

async function boSungMetadata(nguon, options = {}) {
    const metadata = await metadataService.layMetadata(nguon.buffer, { dinhDang: nguon.dinhDang, tenTep: nguon.tenTep, mimeType: nguon.mimeType, ...options });
    return { ...nguon, dinhDang: nguon.dinhDang || metadata.dinhDang, metadata };
}

async function soSanhTaiLieu(leftValue, rightValue, options = {}) {
    const [left, right] = await Promise.all([
        boSungMetadata(chuanHoaNguon(leftValue, 'Nguồn trái'), options),
        boSungMetadata(chuanHoaNguon(rightValue, 'Nguồn phải'), options)
    ]);
    const ketQuaMetadata = duLieuService.soSanh(left.metadata, right.metadata, { ...(options.metadata || {}), boQuaDuongDan: options.boQuaMetadata || ['/sha256', '/kichThuocBytes'] });
    if (left.metadata.sha256 === right.metadata.sha256) {
        return {
            giongNhau: true,
            giongNhiPhan: true,
            metadata: ketQuaMetadata,
            noiDung: { giongNhau: true, loai: 'NHI_PHAN_GIONG_NHAU' }
        };
    }
    if (DINH_DANG_BANG.includes(left.dinhDang) && DINH_DANG_BANG.includes(right.dinhDang)) {
        const [leftData, rightData] = await Promise.all([
            trichBangService.trichXuat(left.buffer, left.dinhDang, options.bang || {}),
            trichBangService.trichXuat(right.buffer, right.dinhDang, options.bang || {})
        ]);
        const noiDung = duLieuService.soSanh(leftData.sheets, rightData.sheets, options.duLieu || {});
        return { giongNhau: noiDung.giongNhau && ketQuaMetadata.giongNhau, giongNhiPhan: false, metadata: ketQuaMetadata, noiDung: { loai: 'BANG', ...noiDung } };
    }
    try {
        const [leftText, rightText] = await Promise.all([
            trichVanBanService.trichXuat(left.buffer, left.dinhDang, options.vanBan || {}),
            trichVanBanService.trichXuat(right.buffer, right.dinhDang, options.vanBan || {})
        ]);
        const noiDung = vanBanService.soSanh(leftText.vanBan, rightText.vanBan, options.vanBan || {});
        return { giongNhau: noiDung.giongSauChuanHoa && ketQuaMetadata.giongNhau, giongNhiPhan: false, metadata: ketQuaMetadata, noiDung: { loai: 'VAN_BAN', ...noiDung } };
    } catch (error) {
        if (options.choPhepChiMetadata !== true) { throw error; }
        return { giongNhau: ketQuaMetadata.giongNhau, giongNhiPhan: false, metadata: ketQuaMetadata, noiDung: { loai: 'KHONG_TRICH_XUAT_DUOC', thongBao: error.message } };
    }
}

module.exports = {
    DINH_DANG_BANG,
    chuanHoaNguon,
    soSanhTaiLieu
};