'use strict';

const MA_LOI = require('../../../constants/ma-loi');
const { LOAI_CHUYEN_DOI } = require('../../../constants/loai-chuyen-doi');
const { taoLoiTheoStatus: taoLoi } = require('../../../utils/loi');
const registry = require('./converter-registry');
const { taoDoThi, timDuongDi } = require('./conversion-graph');

function taoBuoc(converter, dinhDangNguon, dinhDangDich, thuTu) {
    return Object.freeze({
        thuTu,
        converterKey: converter.key,
        converter,
        dinhDangNguon: dinhDangNguon || null,
        dinhDangDich: dinhDangDich || null,
        chiPhi: converter.chiPhi
    });
}

function taoKeHoach(context, cacBuoc, options = {}) {
    return Object.freeze({
        loaiChuyenDoi: context.loaiChuyenDoi,
        nhomXuLy: context.nhomXuLy || null,
        dinhDangNguon: context.dinhDangNguon || null,
        dinhDangDich: context.dinhDangDich || null,
        trucTiep: options.trucTiep === true,
        chiPhi: cacBuoc.reduce((tong, item) => tong + item.chiPhi, 0),
        cacBuoc: Object.freeze(cacBuoc)
    });
}

async function timTrucTiep(context) {
    return registry.chonConverter({
        loaiChuyenDoi: context.loaiChuyenDoi,
        nhomXuLy: context.nhomXuLy,
        dinhDangNguon: context.dinhDangNguon,
        dinhDangDich: context.dinhDangDich
    }, context);
}

async function layConverterDoThi(context) {
    const ketQua = [];
    for (const converter of registry.layDanhSachConverter()) {
        if (!converter.loaiChuyenDoi.includes(LOAI_CHUYEN_DOI.CHUYEN_DINH_DANG)) { continue; }
        if (context.nhomXuLy && !converter.nhomXuLy.includes('*') && !converter.nhomXuLy.includes(context.nhomXuLy)) { continue; }
        if (!await registry.coHoTro(converter, context)) { continue; }
        ketQua.push(converter);
    }
    return ketQua;
}

async function lapKeHoach(context, options = {}) {
    if (!context?.loaiChuyenDoi) { throw taoLoi(400, 'Thiếu loại chuyển đổi.', MA_LOI.CHUYEN_DOI_KHONG_HO_TRO); }
    const converterKey = context.converterKey || options.converterKey || null;
    if (converterKey) {
        const converter = registry.layConverter(converterKey);
        if (!converter || !registry.phuHopConverter(converter, {
            loaiChuyenDoi: context.loaiChuyenDoi,
            nhomXuLy: context.nhomXuLy,
            dinhDangNguon: context.dinhDangNguon,
            dinhDangDich: context.dinhDangDich
        }) || !await registry.coHoTro(converter, context)) {
            throw taoLoi(422, `Converter "${converterKey}" không hỗ trợ yêu cầu hiện tại.`, MA_LOI.CHUYEN_DOI_KHONG_TIM_THAY_CONVERTER);
        }
        return taoKeHoach(context, [taoBuoc(converter, context.dinhDangNguon, context.dinhDangDich, 1)], { trucTiep: true });
    }
    const trucTiep = await timTrucTiep(context);
    if (trucTiep) { return taoKeHoach(context, [taoBuoc(trucTiep, context.dinhDangNguon, context.dinhDangDich, 1)], { trucTiep: true }); }
    if (context.loaiChuyenDoi !== LOAI_CHUYEN_DOI.CHUYEN_DINH_DANG) { throw taoLoi(422, 'Không tìm thấy converter phù hợp với yêu cầu chuyển đổi.', MA_LOI.CHUYEN_DOI_KHONG_TIM_THAY_CONVERTER); }
    if (!context.dinhDangNguon || !context.dinhDangDich) { throw taoLoi(400, 'Chuyển đổi định dạng yêu cầu đầy đủ định dạng nguồn và định dạng đích.', MA_LOI.CHUYEN_DOI_KHONG_HO_TRO); }
    const danhSachConverter = await layConverterDoThi(context);
    const duongDi = timDuongDi(
        taoDoThi(danhSachConverter),
        context.dinhDangNguon,
        context.dinhDangDich,
        {
            soBuocToiDa: options.soBuocToiDa ?? context.tuyChon?.soBuocToiDa
        }
    );
    if (!duongDi || !duongDi.cacBuoc.length) { throw taoLoi(422, `Không tìm thấy đường chuyển đổi từ "${context.dinhDangNguon}" sang "${context.dinhDangDich}".`, MA_LOI.CHUYEN_DOI_KHONG_TIM_THAY_DUONG_DI); }
    return taoKeHoach(
        context,
        duongDi.cacBuoc.map((item, index) => taoBuoc(item.converter, item.dinhDangNguon, item.dinhDangDich, index + 1))
    );
}

module.exports = {
    lapKeHoach
};