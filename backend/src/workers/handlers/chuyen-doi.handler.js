'use strict';

const { TEN_QUEUE } = require('../../config/queue');
const congViecRepository = require('../../modules/cong-viec/cong-viec.repository');
const congViecService = require('../../modules/cong-viec/cong-viec.service');
const MA_LOI = require('../../constants/ma-loi');
const { TRANG_THAI_CONG_VIEC, laTrangThaiKetThuc } = require('../../constants/trang-thai-cong-viec');
const { taoLoiTheoStatus: taoLoi } = require('../../utils/loi');
const chuyenDoiService = require('../../modules/chuyen-doi/chuyen-doi.service');
const lichSuService = require('../../modules/lich-su/lich-su.service');
const nhatKyService = require('../../modules/nhat-ky/nhat-ky.service');

function parseId(value, ten) {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) { throw taoLoi(400, `${ten} không hợp lệ.`, MA_LOI.CONG_VIEC_KHONG_HOP_LE); }
    return id;
}

function chuanHoaObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function layChuTheCongViec(congViec) {
    return {
        nguoiDungId: congViec?.nguoiDungId || null,
        phienKhachId: congViec?.phienKhachId || null
    };
}

async function ghiLichSuCongViec(congViec, data = {}) {
    if (!congViec?.id) { return null; }
    return lichSuService.ghiNhanAnToan({
        ...data,
        ...layChuTheCongViec(congViec),
        congViecId: congViec.id
    });
}

async function ghiNhatKyWorker(congViec, buoc, data = {}) {
    if (!congViec?.id) { return null; }
    return nhatKyService.ghiAnToan({
        ...data,
        ...layChuTheCongViec(congViec),
        congViecId: congViec.id,
        buocCongViecId: buoc?.id || null
    });
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
    const dangHuy = congViec.trangThai === TRANG_THAI_CONG_VIEC.DANG_HUY;
    if (!dangHuy && congViec.trangThai !== TRANG_THAI_CONG_VIEC.DA_HUY) { return null; }
    if (buoc && buoc.trangThai !== 'HOAN_THANH' && buoc.trangThai !== 'THAT_BAI' && buoc.trangThai !== 'DA_HUY') { await congViecService.capNhatBuoc(buoc.id, { trangThai: 'DA_HUY', danhDauHoanThanh: true }); }
    if (dangHuy) {
        const daHuy = await congViecService.danhDauDaHuy(congViec.id);
        await ghiLichSuCongViec(daHuy, {
            tepId: daHuy.tepNguonId || null,
            phienBanTepId: daHuy.phienBanNguonId || null,
            loaiSuKien: lichSuService.LOAI_SU_KIEN.CHUYEN_DOI_DA_HUY,
            nguon: lichSuService.NGUON_LICH_SU.WORKER,
            tieuDe: 'Đã hủy chuyển đổi',
            moTa: 'Yêu cầu chuyển đổi đã được hủy.'
        });
        await ghiNhatKyWorker(daHuy, buoc, {
            mucDo: nhatKyService.MUC_DO_NHAT_KY.AUDIT,
            nguon: 'WORKER',
            maSuKien: 'CHUYEN_DOI_DA_HUY',
            tepId: daHuy.tepNguonId || null,
            thongDiep: 'Worker đã hoàn tất hủy công việc chuyển đổi.'
        });
    }
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
            if (thongTinLanThu.lanThu === 1) {
                await ghiLichSuCongViec(congViec, {
                    tepId: congViec.tepNguonId || null,
                    phienBanTepId: congViec.phienBanNguonId || null,
                    loaiSuKien: lichSuService.LOAI_SU_KIEN.CHUYEN_DOI_BAT_DAU,
                    nguon: lichSuService.NGUON_LICH_SU.WORKER,
                    tieuDe: 'Bắt đầu chuyển đổi',
                    moTa: `Bắt đầu chuyển đổi từ ${congViec.dinhDangNguon || 'không xác định'} sang ${congViec.dinhDangDich || 'không xác định'}.`
                });
            }
            await ghiNhatKyWorker(congViec, buoc, {
                mucDo: nhatKyService.MUC_DO_NHAT_KY.INFO,
                nguon: 'WORKER',
                maSuKien: 'CHUYEN_DOI_BAT_DAU',
                tepId: congViec.tepNguonId || null,
                thongDiep: 'Worker bắt đầu xử lý chuyển đổi.',
                duLieu: {
                    tenQueue,
                    loaiXuLy,
                    jobId: job.id === undefined || job.id === null ? null : String(job.id),
                    lanThu: thongTinLanThu.lanThu,
                    tongSoLan: thongTinLanThu.tongSoLan
                }
            });
            const engine = layEngine();
            const ketQuaEngine = chuanHoaKetQua(await engine.xuLy(context));
            await kiemTraHuy(congViec.id, buoc);
            const ketQua = await chuyenDoiService.hoanThanhLanXuLy(phienChuyenDoi, { congViec, ketQua: ketQuaEngine });
            await capNhatTienTrinh(100);
            if (buoc) { await congViecService.capNhatBuoc(buoc.id, { trangThai: 'HOAN_THANH', tienTrinh: 100, boXuLy: ketQua.boXuLy || loaiXuLy, congCu: ketQua.congCu || null, phienBanCongCu: ketQua.phienBanCongCu || null, dauRa: chuanHoaObject(ketQua.dauRa), thongKe: chuanHoaObject(ketQua.thongKe), soLanThu: thongTinLanThu.lanThu, danhDauHoanThanh: true }); }
            let congViecHoanThanh = null;
            if (!buoc || ketQua.hoanTatCongViec === true) {
                congViecHoanThanh = await congViecService.hoanThanh(congViec.id, {
                    tepKetQuaId: ketQua.tepKetQuaId || null,
                    phienBanKetQuaId: ketQua.phienBanKetQuaId || null,
                    dauRa: chuanHoaObject(ketQua.dauRa)
                });
                await ghiLichSuCongViec(congViecHoanThanh, {
                    tepId: ketQua.tepKetQuaId || congViecHoanThanh.tepKetQuaId || null,
                    phienBanTepId: ketQua.phienBanKetQuaId || congViecHoanThanh.phienBanKetQuaId || null,
                    loaiSuKien: lichSuService.LOAI_SU_KIEN.CHUYEN_DOI_HOAN_THANH,
                    nguon: lichSuService.NGUON_LICH_SU.WORKER,
                    tieuDe: 'Chuyển đổi hoàn thành',
                    moTa: `Đã chuyển đổi thành công từ ${congViecHoanThanh.dinhDangNguon || 'không xác định'} sang ${congViecHoanThanh.dinhDangDich || 'không xác định'}.`,
                    duLieu: {
                        boXuLy: ketQua.boXuLy || loaiXuLy,
                        congCu: ketQua.congCu || null,
                        phienBanCongCu: ketQua.phienBanCongCu || null
                    }
                });
            }
            await ghiNhatKyWorker(congViecHoanThanh || congViec, buoc, {
                mucDo: nhatKyService.MUC_DO_NHAT_KY.AUDIT,
                nguon: 'WORKER',
                maSuKien: congViecHoanThanh ? 'CHUYEN_DOI_HOAN_THANH' : 'CHUYEN_DOI_BUOC_HOAN_THANH',
                tepId: ketQua.tepKetQuaId || congViec.tepNguonId || null,
                thongDiep: congViecHoanThanh ? 'Chuyển đổi hoàn thành.' : 'Bước chuyển đổi hoàn thành.',
                duLieu: {
                    tenQueue,
                    loaiXuLy,
                    jobId: job.id === undefined || job.id === null ? null : String(job.id),
                    lanThu: thongTinLanThu.lanThu,
                    boXuLy: ketQua.boXuLy || loaiXuLy,
                    congCu: ketQua.congCu || null
                }
            });
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
            if (thongTinLanThu.laLanCuoi) {
                const congViecThatBai = await congViecService.thatBai(congViec.id, { maLoi, thongBaoLoi, chiTietLoi });
                await ghiLichSuCongViec(congViecThatBai, {
                    tepId: congViecThatBai.tepNguonId || null,
                    phienBanTepId: congViecThatBai.phienBanNguonId || null,
                    loaiSuKien: lichSuService.LOAI_SU_KIEN.CHUYEN_DOI_THAT_BAI,
                    nguon: lichSuService.NGUON_LICH_SU.WORKER,
                    tieuDe: 'Chuyển đổi thất bại',
                    moTa: thongBaoLoi,
                    duLieu: { maLoi, lanThu: thongTinLanThu.lanThu }
                });
                await nhatKyService.ghiLoiAnToan(error, {
                    nguon: 'WORKER',
                    maSuKien: 'CHUYEN_DOI_THAT_BAI',
                    ...layChuTheCongViec(congViecThatBai),
                    congViecId: congViecThatBai.id,
                    buocCongViecId: buoc?.id || null,
                    tepId: congViecThatBai.tepNguonId || null,
                    thongDiep: 'Worker xử lý chuyển đổi thất bại sau lần thử cuối.',
                    duLieu: {
                        tenQueue,
                        jobId: job.id === undefined || job.id === null ? null : String(job.id),
                        lanThu: thongTinLanThu.lanThu,
                        tongSoLan: thongTinLanThu.tongSoLan,
                        maLoi
                    }
                });
            } else {
                await congViecService.capNhatTrangThai(congViec.id, { trangThai: TRANG_THAI_CONG_VIEC.CHO_XU_LY, buocHienTai: buoc?.tenBuoc || loaiXuLy, soLanThu: thongTinLanThu.lanThu });
                await ghiNhatKyWorker(congViec, buoc, {
                    mucDo: nhatKyService.MUC_DO_NHAT_KY.WARN,
                    nguon: 'WORKER',
                    maSuKien: 'CHUYEN_DOI_THU_LAI',
                    tepId: congViec.tepNguonId || null,
                    thongDiep: 'Chuyển đổi thất bại tạm thời và sẽ được thử lại.',
                    duLieu: {
                        tenQueue,
                        jobId: job.id === undefined || job.id === null ? null : String(job.id),
                        lanThu: thongTinLanThu.lanThu,
                        tongSoLan: thongTinLanThu.tongSoLan,
                        maLoi
                    }
                });
            }
            throw error;
        }
    };
}

const xuLy = taoHandler({ tenQueue: TEN_QUEUE.CHUYEN_DOI, loaiXuLy: 'CHUYEN_DOI', trangThaiCongViec: TRANG_THAI_CONG_VIEC.DANG_CHUYEN_DOI });

module.exports = { xuLy, taoHandler };