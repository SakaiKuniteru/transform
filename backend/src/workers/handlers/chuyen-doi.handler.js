'use strict';

const { TEN_QUEUE } = require('../../config/queue');
const congViecRepository = require('../../modules/cong-viec/cong-viec.repository');
const congViecService = require('../../modules/cong-viec/cong-viec.service');
const MA_LOI = require('../../constants/ma-loi');
const { TRANG_THAI_CONG_VIEC, laTrangThaiKetThuc } = require('../../constants/trang-thai-cong-viec');
const { taoLoiTheoStatus: taoLoi } = require('../../utils/loi');
const chuyenDoiService = require('../../modules/chuyen-doi/chuyen-doi.service');

function parseId(value, ten) {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) { throw taoLoi(400, `${ten} không hợp lệ.`, MA_LOI.CONG_VIEC_KHONG_HOP_LE); }
    return id;
}

function chuanHoaObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function layThongTinLanThu(job) {
    const lanThu = Number(job.attemptsMade || 0) + 1;
    const tongSoLan = Math.max(1, Number(job.opts?.attempts || 1));
    return { lanThu, tongSoLan, laLanCuoi: lanThu >= tongSoLan };
}

function layMaLoi(error) {
    return String(error?.maLoi || error?.code || MA_LOI.QUEUE_WORKER_THAT_BAI).slice(0, 100);
}

function layThongBaoLoi(error) {
    return String(error?.message || 'Worker xử lý công việc thất bại.').slice(0, 10000);
}

function layChiTietLoi(error, job, thongTinLanThu) {
    return {
        name: error?.name || 'Error',
        queueName: job.queueName || null,
        jobId: job.id === undefined || job.id === null ? null : String(job.id),
        lanThu: thongTinLanThu.lanThu,
        tongSoLan: thongTinLanThu.tongSoLan,
        metadata: chuanHoaObject(error?.metadata),
        chiTiet: error?.chiTiet ?? null
    };
}

function layEngine() {
    const engine = require('../../modules/chuyen-doi/engine/transform-engine.service');
    if (typeof engine?.xuLy !== 'function') { throw taoLoi(500, 'Transform Engine chưa được triển khai.', MA_LOI.CHUYEN_DOI_KHONG_TIM_THAY_CONVERTER); }
    return engine;
}

async function layNguCanh(job) {
    const congViecId = parseId(job.data?.congViecId, 'ID công việc');
    const congViec = await congViecRepository.getChiTietNoiBo(congViecId);
    if (!congViec) { throw taoLoi(404, 'Công việc không tồn tại.', MA_LOI.CONG_VIEC_KHONG_TIM_THAY); }
    const cacBuoc = await congViecRepository.getDanhSachBuoc(congViecId);
    const buocId = job.data?.buocId === undefined || job.data?.buocId === null ? null : parseId(job.data.buocId, 'ID bước công việc');
    const buoc = buocId === null ? null : cacBuoc.find((item) => item.id === buocId) || null;
    if (buocId !== null && !buoc) { throw taoLoi(404, 'Bước công việc không tồn tại hoặc không thuộc công việc.', MA_LOI.BUOC_CONG_VIEC_KHONG_TIM_THAY); }
    return { congViec, cacBuoc, buoc };
}

async function xuLyHuy(congViec, buoc = null) {
    if (congViec.trangThai !== TRANG_THAI_CONG_VIEC.DANG_HUY && congViec.trangThai !== TRANG_THAI_CONG_VIEC.DA_HUY) { return null; }
    if (buoc && buoc.trangThai !== 'HOAN_THANH' && buoc.trangThai !== 'THAT_BAI' && buoc.trangThai !== 'DA_HUY') { await congViecService.capNhatBuoc(buoc.id, { trangThai: 'DA_HUY', danhDauHoanThanh: true }); }
    if (congViec.trangThai === TRANG_THAI_CONG_VIEC.DANG_HUY) { await congViecService.danhDauDaHuy(congViec.id); }
    return { daHuy: true, congViecId: congViec.id, buocId: buoc?.id || null };
}

async function kiemTraHuy(congViecId, buoc = null) {
    const hienTai = await congViecRepository.getChiTietNoiBo(congViecId);
    if (!hienTai) { throw taoLoi(404, 'Công việc không tồn tại.', MA_LOI.CONG_VIEC_KHONG_TIM_THAY); }
    const ketQua = await xuLyHuy(hienTai, buoc);
    if (ketQua) { throw taoLoi(409, 'Công việc đã được yêu cầu hủy.', MA_LOI.CONG_VIEC_DA_HUY, ketQua); }
    return hienTai;
}

function tinhTienTrinhCongViec(cacBuoc, buoc, tienTrinhBuoc) {
    if (!buoc || !cacBuoc.length) { return tienTrinhBuoc; }
    const index = cacBuoc.findIndex((item) => item.id === buoc.id);
    if (index < 0) { return tienTrinhBuoc; }
    return Math.round(((index + tienTrinhBuoc / 100) / cacBuoc.length) * 10000) / 100;
}

function chuanHoaKetQua(value) {
    if (value === undefined || value === null) { return {}; }
    if (!value || typeof value !== 'object' || Array.isArray(value)) { return { dauRa: { giaTri: value } }; }
    return value;
}

function taoHandler({ tenQueue, loaiXuLy, trangThaiCongViec }) {
    if (!Object.values(TEN_QUEUE).includes(tenQueue)) { throw new TypeError(`Queue "${tenQueue}" không hợp lệ.`); }
    if (!Object.values(TRANG_THAI_CONG_VIEC).includes(trangThaiCongViec)) { throw new TypeError(`Trạng thái công việc "${trangThaiCongViec}" không hợp lệ.`); }
    return async function xuLy(job) {
        const thongTinLanThu = layThongTinLanThu(job);
        const { congViec, cacBuoc, buoc } = await layNguCanh(job);
        if (job.queueName !== tenQueue) { throw taoLoi(500, `Job được gửi sai queue. Kỳ vọng "${tenQueue}", nhận "${job.queueName}".`, MA_LOI.QUEUE_WORKER_THAT_BAI); }
        if (laTrangThaiKetThuc(congViec.trangThai)) { return { boQua: true, lyDo: congViec.trangThai, congViecId: congViec.id, buocId: buoc?.id || null }; }
        const ketQuaHuy = await xuLyHuy(congViec, buoc);
        if (ketQuaHuy) { return ketQuaHuy; }
        await congViecService.capNhatTrangThai(congViec.id, { trangThai: trangThaiCongViec, tienTrinh: congViec.tienTrinh, buocHienTai: buoc?.tenBuoc || loaiXuLy, danhDauBatDau: true, soLanThu: thongTinLanThu.lanThu });
        if (buoc) { await congViecService.capNhatBuoc(buoc.id, { trangThai: 'DANG_XU_LY', tienTrinh: buoc.tienTrinh, boXuLy: loaiXuLy, soLanThu: thongTinLanThu.lanThu, danhDauBatDau: true }); }
        let phienChuyenDoi = null;
        const capNhatTienTrinh = async (value) => {
            const tienTrinh = Math.max(0, Math.min(100, Number(value) || 0));
            await kiemTraHuy(congViec.id, buoc);
            await job.updateProgress(tienTrinh);
            if (buoc) { await congViecService.capNhatBuoc(buoc.id, { tienTrinh }); }
            await congViecService.capNhatTienTrinh(congViec.id, tinhTienTrinhCongViec(cacBuoc, buoc, tienTrinh), buoc?.tenBuoc || loaiXuLy);
            return tienTrinh;
        };
        const context = Object.freeze({ tenQueue, loaiXuLy, jobId: String(job.id), congViecId: congViec.id, buocId: buoc?.id || null, congViec, buoc, cacBuoc, dauVao: buoc?.dauVao || congViec.dauVao || {}, tuyChon: { ...(congViec.tuyChon || {}), ...(buoc?.tuyChon || {}) }, jobData: chuanHoaObject(job.data), capNhatTienTrinh, kiemTraHuy: () => kiemTraHuy(congViec.id, buoc) });
        try {
            phienChuyenDoi = await chuyenDoiService.batDauLanXuLy({ congViec, buoc, lanThu: thongTinLanThu.lanThu });
            const engine = layEngine();
            const ketQuaEngine = chuanHoaKetQua(await engine.xuLy(context));
            await kiemTraHuy(congViec.id, buoc);
            const ketQua = await chuyenDoiService.hoanThanhLanXuLy(phienChuyenDoi, { congViec, ketQua: ketQuaEngine });
            await capNhatTienTrinh(100);
            if (buoc) { await congViecService.capNhatBuoc(buoc.id, { trangThai: 'HOAN_THANH', tienTrinh: 100, boXuLy: ketQua.boXuLy || loaiXuLy, congCu: ketQua.congCu || null, phienBanCongCu: ketQua.phienBanCongCu || null, dauRa: chuanHoaObject(ketQua.dauRa), thongKe: chuanHoaObject(ketQua.thongKe), soLanThu: thongTinLanThu.lanThu, danhDauHoanThanh: true }); }
            if (!buoc || ketQua.hoanTatCongViec === true) { await congViecService.hoanThanh(congViec.id, { tepKetQuaId: ketQua.tepKetQuaId || null, phienBanKetQuaId: ketQua.phienBanKetQuaId || null, dauRa: chuanHoaObject(ketQua.dauRa) }); }
            return { congViecId: congViec.id, buocId: buoc?.id || null, loaiXuLy, ...ketQua };
        } catch (error) {
            if (error?.maLoi === MA_LOI.CONG_VIEC_DA_HUY) {
                if (phienChuyenDoi) { await chuyenDoiService.huyLanXuLy(phienChuyenDoi); }
                return error.chiTiet || { daHuy: true, congViecId: congViec.id, buocId: buoc?.id || null };
            }
            const hienTai = await congViecRepository.getChiTietNoiBo(congViec.id);
            const ketQuaHuySauLoi = hienTai ? await xuLyHuy(hienTai, buoc) : null;
            if (ketQuaHuySauLoi) {
                if (phienChuyenDoi) { await chuyenDoiService.huyLanXuLy(phienChuyenDoi); }
                return ketQuaHuySauLoi;
            }
            if (phienChuyenDoi) { await chuyenDoiService.thatBaiLanXuLy(phienChuyenDoi, error); }
            const maLoi = layMaLoi(error);
            const thongBaoLoi = layThongBaoLoi(error);
            const chiTietLoi = layChiTietLoi(error, job, thongTinLanThu);
            if (buoc) { await congViecService.capNhatBuoc(buoc.id, { trangThai: thongTinLanThu.laLanCuoi ? 'THAT_BAI' : 'CHO_XU_LY', tienTrinh: 0, boXuLy: loaiXuLy, soLanThu: thongTinLanThu.lanThu, maLoi, thongBaoLoi, chiTietLoi, danhDauHoanThanh: thongTinLanThu.laLanCuoi }); }
            if (thongTinLanThu.laLanCuoi) { await congViecService.thatBai(congViec.id, { maLoi, thongBaoLoi, chiTietLoi }); } else { await congViecService.capNhatTrangThai(congViec.id, { trangThai: TRANG_THAI_CONG_VIEC.CHO_XU_LY, buocHienTai: buoc?.tenBuoc || loaiXuLy, soLanThu: thongTinLanThu.lanThu }); }
            throw error;
        }
    };
}

const xuLy = taoHandler({ tenQueue: TEN_QUEUE.CHUYEN_DOI, loaiXuLy: 'CHUYEN_DOI', trangThaiCongViec: TRANG_THAI_CONG_VIEC.DANG_CHUYEN_DOI });

module.exports = { xuLy, taoHandler };