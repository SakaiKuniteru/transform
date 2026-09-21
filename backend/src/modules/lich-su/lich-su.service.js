'use strict';

const repository = require('./lich-su.repository');
const MA_LOI = require('../../constants/ma-loi');
const { taoLoiTheoStatus: taoLoi } = require('../../utils/loi');

const LOAI_SU_KIEN = Object.freeze({
    TEP_DA_TAI_LEN: 'TEP_DA_TAI_LEN',
    TEP_DA_CAP_NHAT: 'TEP_DA_CAP_NHAT',
    TEP_DA_XOA: 'TEP_DA_XOA',
    CHUYEN_DOI_DA_TAO: 'CHUYEN_DOI_DA_TAO',
    CHUYEN_DOI_BAT_DAU: 'CHUYEN_DOI_BAT_DAU',
    CHUYEN_DOI_HOAN_THANH: 'CHUYEN_DOI_HOAN_THANH',
    CHUYEN_DOI_THAT_BAI: 'CHUYEN_DOI_THAT_BAI',
    CHUYEN_DOI_DA_HUY: 'CHUYEN_DOI_DA_HUY',
    TEP_KET_QUA_DA_TAO: 'TEP_KET_QUA_DA_TAO'
});

const NGUON_LICH_SU = Object.freeze({
    HE_THONG: 'HE_THONG',
    API: 'API',
    UPLOAD: 'UPLOAD',
    WORKER: 'WORKER',
    QUEUE: 'QUEUE',
    STORAGE: 'STORAGE'
});

function parseId(value, ten, batBuoc = false) {
    if (value === undefined || value === null || value === '') {
        if (batBuoc) { throw taoLoi(400, `${ten} là bắt buộc.`, MA_LOI.ID_KHONG_HOP_LE); }
        return null;
    }
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) { throw taoLoi(400, `${ten} không hợp lệ.`, MA_LOI.ID_KHONG_HOP_LE); }
    return id;
}

function chuanHoaChuThe(chuThe = {}, batBuoc = true) {
    const nguoiDungId = parseId(chuThe.nguoiDungId, 'ID người dùng');
    const phienKhachId = parseId(chuThe.phienKhachId, 'ID phiên khách');
    if (nguoiDungId && phienKhachId) { throw new TypeError('Lịch sử không thể đồng thời thuộc người dùng và phiên khách.'); }
    if (batBuoc && !nguoiDungId && !phienKhachId) { throw taoLoi(401, 'Không xác định được chủ sở hữu lịch sử.', MA_LOI.CHUA_XAC_THUC); }
    return { nguoiDungId, phienKhachId };
}

function chuanHoaChuoi(value, ten, maxLength, batBuoc = false) {
    if (value === undefined || value === null) {
        if (batBuoc) { throw new TypeError(`${ten} là bắt buộc.`); }
        return null;
    }
    const text = String(value).trim();
    if (batBuoc && !text) { throw new TypeError(`${ten} không được để trống.`); }
    if (!text) { return null; }
    if (text.length > maxLength) { throw new TypeError(`${ten} không được vượt quá ${maxLength} ký tự.`); }
    return text;
}

function chuanHoaDuLieu(value) {
    if (value === undefined || value === null) { return {}; }
    if (!value || typeof value !== 'object' || Array.isArray(value)) { throw new TypeError('Dữ liệu lịch sử phải là object.'); }
    return value;
}

async function ghiNhan(data = {}, db = null) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) { throw new TypeError('Dữ liệu lịch sử phải là object.'); }
    const owner = chuanHoaChuThe(data, false);
    return repository.tao({
        ...owner,
        congViecId: parseId(data.congViecId, 'ID công việc'),
        tepId: parseId(data.tepId, 'ID tệp'),
        phienBanTepId: parseId(data.phienBanTepId, 'ID phiên bản tệp'),
        loaiSuKien: chuanHoaChuoi(data.loaiSuKien, 'Loại sự kiện', 100, true).toUpperCase(),
        nguon: chuanHoaChuoi(data.nguon || NGUON_LICH_SU.HE_THONG, 'Nguồn lịch sử', 50, true).toUpperCase(),
        tieuDe: chuanHoaChuoi(data.tieuDe, 'Tiêu đề lịch sử', 255, true),
        moTa: chuanHoaChuoi(data.moTa, 'Mô tả lịch sử', 10000),
        duLieu: chuanHoaDuLieu(data.duLieu),
        hienThiChoNguoiDung: data.hienThiChoNguoiDung !== false
    }, db);
}

async function ghiNhanAnToan(data = {}, db = null) {
    try { return await ghiNhan(data, db); } catch { return null; }
}

async function ghiNhanTuCongViec(congViec, data = {}, db = null) {
    if (!congViec?.id) { throw new TypeError('Công việc không hợp lệ để ghi lịch sử.'); }
    return ghiNhan({
        ...data,
        nguoiDungId: congViec.nguoiDungId || null,
        phienKhachId: congViec.phienKhachId || null,
        congViecId: congViec.id
    }, db);
}

async function getDanhSach(chuThe, query = {}) {
    const owner = chuanHoaChuThe(chuThe);
    const trang = Number(query.trang || 1);
    const gioiHan = Number(query.gioiHan || 20);
    const filters = {
        trang,
        gioiHan,
        offset: (trang - 1) * gioiHan,
        loaiSuKien: chuanHoaChuoi(query.loaiSuKien, 'Loại sự kiện', 100)?.toUpperCase() || null,
        nguon: chuanHoaChuoi(query.nguon, 'Nguồn lịch sử', 50)?.toUpperCase() || null,
        congViecId: parseId(query.congViecId, 'ID công việc'),
        tepId: parseId(query.tepId, 'ID tệp'),
        phienBanTepId: parseId(query.phienBanTepId, 'ID phiên bản tệp'),
        tuKhoa: String(query.tuKhoa || '').trim(),
        tuNgay: query.tuNgay || null,
        denNgay: query.denNgay || null
    };
    const [danhSach, tongSo] = await Promise.all([
        repository.getDanhSach(owner, filters),
        repository.demDanhSach(owner, filters)
    ]);
    return {
        danhSach,
        phanTrang: {
            trang,
            gioiHan,
            tongSo,
            tongTrang: Math.max(1, Math.ceil(tongSo / gioiHan))
        }
    };
}

async function getChiTiet(id, chuThe) {
    const lichSuId = parseId(id, 'ID lịch sử', true);
    const owner = chuanHoaChuThe(chuThe);
    const lichSu = await repository.getChiTiet(lichSuId, owner);
    if (!lichSu) { throw taoLoi(404, 'Lịch sử không tồn tại hoặc không thuộc quyền sở hữu của bạn.', MA_LOI.KHONG_TIM_THAY); }
    return lichSu;
}

module.exports = {
    LOAI_SU_KIEN,
    NGUON_LICH_SU,
    ghiNhan,
    ghiNhanAnToan,
    ghiNhanTuCongViec,
    getDanhSach,
    getChiTiet
};