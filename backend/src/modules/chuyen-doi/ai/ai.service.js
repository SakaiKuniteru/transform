'use strict';

const env = require('../../../config/env');
const MA_LOI = require('../../../constants/ma-loi');
const { LOAI_CHUYEN_DOI } = require('../../../constants/loai-chuyen-doi');
const { taoLoi } = require('../../../utils/loi');
const providerService = require('./ai-provider');
const instructionParser = require('./instruction-parser.service');
const keHoachService = require('./ke-hoach-thay-doi.service');
const registry = require('../engine/converter-registry');

let daKhoiTaoProviderMacDinh = false;

function khoiTaoProviderMacDinh() {
    if (daKhoiTaoProviderMacDinh) { return; }
    daKhoiTaoProviderMacDinh = true;
    if (!env.tichHop.ai.provider || !env.tichHop.ai.baseUrl) { return; }
    if (!providerService.layProvider(env.tichHop.ai.provider)) { providerService.dangKyProvider(providerService.taoHttpProvider({ ma: env.tichHop.ai.provider }), { thayThe: true }); }
}

function chuanHoaPhanHoiKeHoach(value) {
    let data = value?.output ?? value?.keHoach ?? value?.plan ?? value;
    if (typeof data === 'string') {
        try { data = JSON.parse(data); }
        catch { throw taoLoi({ maLoi: MA_LOI.AI_PHAN_HOI_KHONG_HOP_LE, thongBao: 'AI provider không trả kế hoạch JSON hợp lệ.', statusCode: 502, expose: true }); }
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) { throw taoLoi({ maLoi: MA_LOI.AI_PHAN_HOI_KHONG_HOP_LE, thongBao: 'AI provider trả kế hoạch không hợp lệ.', statusCode: 502, expose: true }); }
    const cacBuoc = Array.isArray(data.cacBuoc) ? data.cacBuoc : Array.isArray(data.steps) ? data.steps : null;
    if (!cacBuoc) { throw taoLoi({ maLoi: MA_LOI.AI_PHAN_HOI_KHONG_HOP_LE, thongBao: 'AI provider không trả danh sách bước.', statusCode: 502, expose: true }); }
    return { cacBuoc };
}

function layDanhSachKhaNang() {
    return registry.layDanhSachConverter().map((item) => ({
        key: item.key,
        loaiChuyenDoi: item.loaiChuyenDoi,
        nhomXuLy: item.nhomXuLy,
        dinhDangNguon: item.dinhDangNguon,
        dinhDangDich: item.dinhDangDich
    }));
}

async function taoKeHoach(input = {}) {
    khoiTaoProviderMacDinh();
    const parsed = instructionParser.parseInstruction(input.chiDan ?? input.instruction);
    if (parsed.cacBuoc?.length && parsed.canAI !== true) {
        const keHoach = await keHoachService.xacThucKeHoach({
            dinhDangNguon: input.dinhDangNguon,
            nhomXuLy: input.nhomXuLy,
            cacBuoc: parsed.cacBuoc
        });
        return { nguon: parsed.nguon, provider: null, keHoach };
    }
    const provider = await providerService.chonProvider(input.provider || null, 'taoKeHoach');
    const result = await provider.taoKeHoach({
        chiDan: parsed.chiDan || input.chiDan || input.instruction,
        dinhDangNguon: input.dinhDangNguon,
        nhomXuLy: input.nhomXuLy || null,
        tuyChon: input.tuyChon || {},
        khaNang: layDanhSachKhaNang(),
        quyTac: {
            chiSuDungConverterDaDangKy: true,
            camShell: true,
            camDuongDanStorage: true,
            soBuocToiDa: keHoachService.SO_BUOC_TOI_DA
        },
        signal: input.signal
    });
    const phanHoi = chuanHoaPhanHoiKeHoach(result);
    const keHoach = await keHoachService.xacThucKeHoach({
        dinhDangNguon: input.dinhDangNguon,
        nhomXuLy: input.nhomXuLy,
        cacBuoc: phanHoi.cacBuoc
    });
    return {
        nguon: 'AI',
        provider: provider.ma,
        model: result.model || null,
        usage: result.usage || null,
        keHoach
    };
}

function taoChiDanTacVu(loaiChuyenDoi, chiDan = null) {
    const map = {
        [LOAI_CHUYEN_DOI.TOM_TAT]: 'Tóm tắt văn bản, giữ nguyên ý chính và không thêm thông tin không có trong nguồn.',
        [LOAI_CHUYEN_DOI.CHINH_SUA]: 'Chỉnh sửa văn bản theo yêu cầu, giữ nguyên nội dung cốt lõi trừ khi yêu cầu nói khác.',
        [LOAI_CHUYEN_DOI.KIEM_TRA]: 'Kiểm tra và sửa lỗi chính tả, ngữ pháp và diễn đạt; không thay đổi ý nghĩa không cần thiết.',
        [LOAI_CHUYEN_DOI.CHUAN_HOA]: 'Chuẩn hóa văn bản về cách viết, khoảng trắng, dấu câu và cấu trúc dễ đọc.',
        [LOAI_CHUYEN_DOI.THU_GON]: 'Thu gọn văn bản nhưng giữ các thông tin quan trọng.',
        [LOAI_CHUYEN_DOI.DINH_DANG_LAI]: 'Định dạng lại văn bản theo yêu cầu mà không làm sai nội dung.',
        [LOAI_CHUYEN_DOI.THAY_THE]: 'Thực hiện thay thế nội dung đúng theo yêu cầu.'
    };
    return String(chiDan || map[loaiChuyenDoi] || '').trim();
}

async function xuLyVanBan(input = {}) {
    khoiTaoProviderMacDinh();
    const vanBan = String(input.vanBan ?? input.text ?? '');
    if (!vanBan.trim()) { throw taoLoi({ maLoi: MA_LOI.AI_THAT_BAI, thongBao: 'Văn bản AI xử lý không được để trống.', statusCode: 400, expose: true }); }
    const loaiChuyenDoi = String(input.loaiChuyenDoi || '').trim().toUpperCase();
    const choPhep = [
        LOAI_CHUYEN_DOI.TOM_TAT,
        LOAI_CHUYEN_DOI.CHINH_SUA,
        LOAI_CHUYEN_DOI.KIEM_TRA,
        LOAI_CHUYEN_DOI.CHUAN_HOA,
        LOAI_CHUYEN_DOI.THU_GON,
        LOAI_CHUYEN_DOI.DINH_DANG_LAI,
        LOAI_CHUYEN_DOI.THAY_THE
    ];
    if (!choPhep.includes(loaiChuyenDoi)) { throw taoLoi({ maLoi: MA_LOI.AI_THAT_BAI, thongBao: 'Loại xử lý AI chưa được hỗ trợ.', statusCode: 422, expose: true }); }
    const provider = await providerService.chonProvider(input.provider || null, 'xuLyVanBan');
    const chiDan = taoChiDanTacVu(loaiChuyenDoi, input.chiDan || input.tuyChon?.chiDan);
    const result = await provider.xuLyVanBan({
        vanBan,
        loaiChuyenDoi,
        chiDan,
        tuyChon: input.tuyChon || {},
        signal: input.signal
    });
    if (!result || typeof result.vanBan !== 'string') { throw taoLoi({ maLoi: MA_LOI.AI_PHAN_HOI_KHONG_HOP_LE, thongBao: 'AI provider trả văn bản không hợp lệ.', statusCode: 502, expose: true }); }
    return {
        vanBan: result.vanBan,
        provider: provider.ma,
        model: result.model || null,
        usage: result.usage || null,
        thongKe: {
            soKyTuNguon: vanBan.length,
            soKyTuDich: result.vanBan.length
        }
    };
}

module.exports = {
    khoiTaoProviderMacDinh,
    taoKeHoach,
    xuLyVanBan,
    dangKyProvider: providerService.dangKyProvider,
    huyDangKyProvider: providerService.huyDangKyProvider,
    layDanhSachProvider: providerService.layDanhSachProvider
};