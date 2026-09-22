'use strict';

const MA_LOI = require('../../../constants/ma-loi');
const { taoLoi, laLoiUngDung } = require('../../../utils/loi');
const registry = require('./converter-registry');
const planner = require('./conversion-planner');
const { taoTransformContext } = require('./transform-context');

function chuanHoaObject(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }

function chuanHoaKetQuaConverter(value, buocKeHoach, laBuocCuoi) {
    if (value === undefined || value === null) { value = {}; }
    if (typeof value !== 'object' || Array.isArray(value)) { value = { dauRa: value }; }
    if (!laBuocCuoi && value.dauRa === undefined) {
        throw taoLoi({
            maLoi: MA_LOI.CHUYEN_DOI_KET_QUA_KHONG_HOP_LE,
            thongBao: `Converter "${buocKeHoach.converterKey}" không trả dauRa cho bước trung gian.`,
            statusCode: 500,
            expose: false
        });
    }
    return {
        ...value,
        dauRa: value.dauRa,
        dinhDangDich: value.dinhDangDich || buocKeHoach.dinhDangDich || null,
        thongKe: chuanHoaObject(value.thongKe)
    };
}

function laBuocCuoiCongViec(context) {
    if (!context.buoc) { return true; }
    if (!Array.isArray(context.cacBuoc) || !context.cacBuoc.length) { return false; }
    const index = context.cacBuoc.findIndex((item) => item?.id === context.buoc.id);
    return index >= 0 && index === context.cacBuoc.length - 1;
}

function taoKetQuaCuoi(context, keHoach, ketQuaCuoi, thongKeBuoc, batDau) {
    const converterCuoi = keHoach.cacBuoc[keHoach.cacBuoc.length - 1]?.converter || null;
    const tongThoiGianMs = Date.now() - batDau;
    return {
        boXuLy: ketQuaCuoi.boXuLy || converterCuoi?.engine || converterCuoi?.key || context.nhomXuLy || null,
        congCu: ketQuaCuoi.congCu || converterCuoi?.engine || converterCuoi?.key || null,
        phienBanCongCu: ketQuaCuoi.phienBanCongCu || converterCuoi?.phienBanEngine || null,
        dauRa: ketQuaCuoi.dauRa === undefined ? context.dauVao : ketQuaCuoi.dauRa,
        dinhDangDich: ketQuaCuoi.dinhDangDich || context.dinhDangDich || null,
        thongKe: {
            ...ketQuaCuoi.thongKe,
            engine: {
                soBuoc: keHoach.cacBuoc.length,
                chiPhi: keHoach.chiPhi,
                trucTiep: keHoach.trucTiep,
                tongThoiGianMs,
                cacBuoc: thongKeBuoc
            }
        },
        tepKetQuaId: ketQuaCuoi.tepKetQuaId || null,
        phienBanKetQuaId: ketQuaCuoi.phienBanKetQuaId || null,
        hoanTatCongViec: ketQuaCuoi.hoanTatCongViec === undefined ? laBuocCuoiCongViec(context) : ketQuaCuoi.hoanTatCongViec === true
    };
}

async function xuLy(input = {}) {
    const context = taoTransformContext(input);
    const batDau = Date.now();
    try {
        await context.kiemTraHuy();
        const keHoach = await planner.lapKeHoach(context);
        if (!keHoach.cacBuoc.length) {
            throw taoLoi({
                maLoi: MA_LOI.CHUYEN_DOI_KHONG_TIM_THAY_CONVERTER,
                thongBao: 'Kế hoạch chuyển đổi không có bước xử lý.',
                statusCode: 422,
                expose: true
            });
        }
        await context.capNhatTienTrinh(0);
        let dauVaoHienTai = context.dauVao;
        let ketQuaCuoi = {};
        const thongKeBuoc = [];
        for (let index = 0; index < keHoach.cacBuoc.length; index += 1) {
            const buocKeHoach = keHoach.cacBuoc[index];
            const laBuocCuoi = index === keHoach.cacBuoc.length - 1;
            const contextConverter = context.taoContextConverter(
                buocKeHoach,
                index,
                keHoach.cacBuoc.length,
                dauVaoHienTai
            );
            await contextConverter.kiemTraHuy();
            const batDauBuoc = Date.now();
            const ketQua = chuanHoaKetQuaConverter(
                await buocKeHoach.converter.xuLy(contextConverter),
                buocKeHoach,
                laBuocCuoi
            );
            await contextConverter.kiemTraHuy();
            await contextConverter.capNhatTienTrinh(100);
            thongKeBuoc.push({
                thuTu: index + 1,
                converterKey: buocKeHoach.converterKey,
                dinhDangNguon: buocKeHoach.dinhDangNguon,
                dinhDangDich: ketQua.dinhDangDich,
                thoiGianMs: Date.now() - batDauBuoc
            });
            if (ketQua.dauRa !== undefined) { dauVaoHienTai = ketQua.dauRa; }
            ketQuaCuoi = {
                ...ketQua,
                dauRa: ketQua.dauRa === undefined ? dauVaoHienTai : ketQua.dauRa
            };
        }
        await context.capNhatTienTrinh(100);
        return taoKetQuaCuoi(
            context,
            keHoach,
            ketQuaCuoi,
            thongKeBuoc,
            batDau
        );
    } catch (error) {
        if (laLoiUngDung(error)) { throw error; }
        throw taoLoi({
            maLoi: MA_LOI.CHUYEN_DOI_THAT_BAI,
            thongBao: 'Quá trình chuyển đổi thất bại.',
            statusCode: 500,
            expose: false,
            cause: error,
            metadata: {
                loaiChuyenDoi: context.loaiChuyenDoi,
                dinhDangNguon: context.dinhDangNguon,
                dinhDangDich: context.dinhDangDich
            }
        });
    }
}

module.exports = {
    xuLy,
    dangKyConverter: registry.dangKyConverter,
    huyDangKyConverter: registry.huyDangKyConverter,
    layConverter: registry.layConverter,
    layDanhSachConverter: registry.layDanhSachConverter,
    xoaTatCaConverter: registry.xoaTatCaConverter
};