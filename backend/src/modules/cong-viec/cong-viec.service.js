'use strict';

const repository = require('./cong-viec.repository');
const MA_LOI = require('../../constants/ma-loi');
const { taoLoiTheoStatus: taoLoi } = require('../../utils/loi');
const {
    giaoDich,
    ISOLATION_LEVEL
} = require('../../infrastructure/database/transaction');
const {
    TRANG_THAI_CONG_VIEC,
    DANH_SACH_TRANG_THAI_CONG_VIEC,
    laTrangThaiKetThuc
} = require('../../constants/trang-thai-cong-viec');

function parseId(value, ten = 'ID công việc') {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) { throw taoLoi(400, `${ten} không hợp lệ.`, MA_LOI.ID_KHONG_HOP_LE); }
    return id;
}

function chuanHoaChuThe(chuThe = {}) {
    const coNguoiDung = chuThe.nguoiDungId !== undefined && chuThe.nguoiDungId !== null;
    const coPhienKhach = chuThe.phienKhachId !== undefined && chuThe.phienKhachId !== null;
    if (coNguoiDung === coPhienKhach) { throw taoLoi(401, 'Không xác định được chủ sở hữu công việc.', MA_LOI.CHU_SO_HUU_CONG_VIEC_KHONG_HOP_LE); }
    return {
        nguoiDungId: coNguoiDung ? parseId(chuThe.nguoiDungId, 'ID người dùng') : null,
        phienKhachId: coPhienKhach ? parseId(chuThe.phienKhachId, 'ID phiên khách') : null
    };
}

function chuanHoaChuoi(value, ten, maxLength, batBuoc = false) {
    const text = String(value ?? '').trim();
    if (!text) {
        if (batBuoc) { throw taoLoi(400, `${ten} không được để trống.`, MA_LOI.DU_LIEU_KHONG_HOP_LE); }
        return null;
    }
    if (text.length > maxLength) { throw taoLoi(400, `${ten} không được vượt quá ${maxLength} ký tự.`, MA_LOI.DU_LIEU_KHONG_HOP_LE); }
    return text;
}

function chuanHoaObject(value, ten) {
    if (value === undefined || value === null) { return {}; }
    if (!value || typeof value !== 'object' || Array.isArray(value)) { throw taoLoi(400, `${ten} phải là object.`, MA_LOI.DU_LIEU_KHONG_HOP_LE); }
    return value;
}

function chuanHoaMucDoUuTien(value = 5) {
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 1 || number > 10) { throw taoLoi(400, 'Mức độ ưu tiên phải từ 1 đến 10.', MA_LOI.MUC_DO_UU_TIEN_KHONG_HOP_LE); }
    return number;
}

function chuanHoaSoLanThuToiDa(value = 3) {
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 0) { throw taoLoi(400, 'Số lần thử tối đa không hợp lệ.', MA_LOI.SO_LAN_THU_KHONG_HOP_LE); }
    return number;
}

function chuanHoaTienTrinh(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0 || number > 100) { throw taoLoi(400, 'Tiến trình phải nằm trong khoảng từ 0 đến 100.', MA_LOI.TIEN_TRINH_KHONG_HOP_LE); }
    return Math.round(number * 100) / 100;
}

function chuanHoaTrangThai(value) {
    const trangThai = String(value || '').trim().toUpperCase();
    if (!DANH_SACH_TRANG_THAI_CONG_VIEC.includes(trangThai)) { throw taoLoi(400, 'Trạng thái công việc không hợp lệ.', MA_LOI.TRANG_THAI_CONG_VIEC_KHONG_HOP_LE); }
    return trangThai;
}

function chuanHoaBuoc(item, index) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) { throw taoLoi(400, 'Bước công việc không hợp lệ.', MA_LOI.BUOC_CONG_VIEC_KHONG_HOP_LE); }
    return {
        thuTu: index + 1,
        maBuoc: chuanHoaChuoi(item.maBuoc, 'Mã bước', 100, true),
        tenBuoc: chuanHoaChuoi(item.tenBuoc, 'Tên bước', 255, true),
        loaiBuoc: chuanHoaChuoi(item.loaiBuoc, 'Loại bước', 50, true),
        batBuoc: item.batBuoc !== false,
        dauVao: chuanHoaObject(item.dauVao, 'Đầu vào bước'),
        tuyChon: chuanHoaObject(item.tuyChon, 'Tùy chọn bước'),
        soLanThuToiDa: chuanHoaSoLanThuToiDa(item.soLanThuToiDa ?? 1)
    };
}

async function taoCongViec(data = {}, chuThe) {
    const owner = chuanHoaChuThe(chuThe);
    const loaiCongViec = chuanHoaChuoi(data.loaiCongViec, 'Loại công việc', 50, true);
    const khoaIdempotency = chuanHoaChuoi(data.khoaIdempotency, 'Khóa idempotency', 128);
    if (khoaIdempotency) {
        const hienTai = await repository.getByIdempotency(owner, khoaIdempotency);
        if (hienTai) {
            return {
                ...hienTai,
                cacBuoc: await repository.getDanhSachBuoc(hienTai.id),
                daTonTai: true
            };
        }
    }
    let nguon = null;
    if (data.tepNguonId !== undefined && data.tepNguonId !== null) {
        const tepNguonId = parseId(data.tepNguonId, 'ID tệp nguồn');
        const phienBanNguonId = data.phienBanNguonId === undefined || data.phienBanNguonId === null ? null : parseId(data.phienBanNguonId, 'ID phiên bản nguồn');
        nguon = await repository.getNguonHopLe(tepNguonId, phienBanNguonId, owner);
        if (!nguon) { throw taoLoi(404, 'Tệp nguồn hoặc phiên bản nguồn không tồn tại hoặc không thuộc quyền sở hữu của bạn.', MA_LOI.TEP_NGUON_KHONG_HOP_LE); }
    } else if (data.phienBanNguonId !== undefined && data.phienBanNguonId !== null) {
        throw taoLoi(400, 'Có phiên bản nguồn thì phải truyền tệp nguồn.', MA_LOI.TEP_NGUON_KHONG_HOP_LE);
    }
    const cacBuoc = Array.isArray(data.cacBuoc) ? data.cacBuoc.map(chuanHoaBuoc) : [];
    try {
        const congViec = await giaoDich(async (db) => {
            const taoMoi = await repository.tao({
                ...owner,
                khoaIdempotency,
                loaiCongViec,
                trangThai: TRANG_THAI_CONG_VIEC.CHO_XU_LY,
                mucDoUuTien: chuanHoaMucDoUuTien(data.mucDoUuTien),
                tienTrinh: 0,
                buocHienTai: null,
                tepNguonId: nguon?.tepId || null,
                phienBanNguonId: nguon?.phienBanId || null,
                dinhDangNguon: chuanHoaChuoi(data.dinhDangNguon || nguon?.dinhDang, 'Định dạng nguồn', 50),
                dinhDangDich: chuanHoaChuoi(data.dinhDangDich, 'Định dạng đích', 50),
                dauVao: chuanHoaObject(data.dauVao, 'Đầu vào'),
                tuyChon: chuanHoaObject(data.tuyChon, 'Tùy chọn'),
                dauRa: {},
                soLanThu: 0,
                soLanThuToiDa: chuanHoaSoLanThuToiDa(data.soLanThuToiDa),
                hetHanLuc: data.hetHanLuc || null
            }, db);
            for (const buoc of cacBuoc) {
                await repository.taoBuoc({
                    congViecId: taoMoi.id,
                    ...buoc
                }, db);
            }
            return taoMoi;
        }, {
            isolationLevel: ISOLATION_LEVEL.READ_COMMITTED
        });
        return {
            ...congViec,
            cacBuoc: await repository.getDanhSachBuoc(congViec.id),
            daTonTai: false
        };
    } catch (error) {
        if (error.code === '23505' && khoaIdempotency) {
            const hienTai = await repository.getByIdempotency(owner, khoaIdempotency);
            if (hienTai) {
                return {
                    ...hienTai,
                    cacBuoc: await repository.getDanhSachBuoc(hienTai.id),
                    daTonTai: true
                };
            }
        }
        throw error;
    }
}

async function getDanhSach(chuThe, query = {}) {
    const owner = chuanHoaChuThe(chuThe);
    const trang = Number(query.trang || 1);
    const gioiHan = Number(query.gioiHan || 20);
    const filters = {
        trang,
        gioiHan,
        offset: (trang - 1) * gioiHan,
        trangThai: query.trangThai || null,
        loaiCongViec: String(query.loaiCongViec || '').trim() || null,
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
    const congViecId = parseId(id);
    const owner = chuanHoaChuThe(chuThe);
    const congViec = await repository.getChiTiet(congViecId, owner);
    if (!congViec) { throw taoLoi(404, 'Công việc không tồn tại hoặc không thuộc quyền sở hữu của bạn.', MA_LOI.CONG_VIEC_KHONG_TIM_THAY); }
    return {
        ...congViec,
        cacBuoc: await repository.getDanhSachBuoc(congViecId)
    };
}

async function huy(id, chuThe) {
    const congViecId = parseId(id);
    const owner = chuanHoaChuThe(chuThe);
    const hienTai = await repository.getChiTiet(congViecId, owner);
    if (!hienTai) { throw taoLoi(404, 'Công việc không tồn tại hoặc không thuộc quyền sở hữu của bạn.', MA_LOI.CONG_VIEC_KHONG_TIM_THAY); }
    if (hienTai.trangThai === TRANG_THAI_CONG_VIEC.DA_HUY || hienTai.trangThai === TRANG_THAI_CONG_VIEC.DANG_HUY) { return getChiTiet(congViecId, owner); }
    if (laTrangThaiKetThuc(hienTai.trangThai)) { throw taoLoi(409, 'Công việc đã kết thúc nên không thể hủy.', MA_LOI.CONG_VIEC_KHONG_THE_HUY); }
    await giaoDich(async (db) => {
        const ketQua = await repository.yeuCauHuy(congViecId, owner, db);
        if (!ketQua) { throw taoLoi(409, 'Trạng thái công việc đã thay đổi nên không thể hủy.', MA_LOI.CONG_VIEC_KHONG_THE_HUY); }
        if (ketQua.trangThai === TRANG_THAI_CONG_VIEC.DA_HUY) { await repository.huyBuocChuaXuLy(congViecId, db); }
    }, {
        isolationLevel: ISOLATION_LEVEL.READ_COMMITTED
    });
    return getChiTiet(congViecId, owner);
}

async function ganQueue(id, queueName, queueJobId) {
    const congViecId = parseId(id);
    const tenQueue = chuanHoaChuoi(queueName, 'Tên queue', 100, true);
    const jobId = chuanHoaChuoi(queueJobId, 'Queue job ID', 255, true);
    const congViec = await repository.ganQueue(congViecId, tenQueue, jobId);
    if (!congViec) { throw taoLoi(404, 'Công việc không tồn tại.', MA_LOI.CONG_VIEC_KHONG_TIM_THAY); }
    return congViec;
}

async function capNhatTrangThai(id, data = {}) {
    const congViecId = parseId(id);
    const trangThai = chuanHoaTrangThai(data.trangThai);
    const congViec = await repository.capNhatTrangThai(congViecId, {
        trangThai,
        tienTrinh: data.tienTrinh === undefined ? null : chuanHoaTienTrinh(data.tienTrinh),
        coBuocHienTai: Object.prototype.hasOwnProperty.call(data, 'buocHienTai'),
        buocHienTai: data.buocHienTai === null ? null : chuanHoaChuoi(data.buocHienTai, 'Bước hiện tại', 255),
        danhDauBatDau: data.danhDauBatDau === true
    });
    if (!congViec) { throw taoLoi(404, 'Công việc không tồn tại.', MA_LOI.CONG_VIEC_KHONG_TIM_THAY); }
    return congViec;
}

async function capNhatTienTrinh(id, tienTrinh, buocHienTai = null) {
    const congViecId = parseId(id);
    const congViec = await repository.capNhatTienTrinh(
        congViecId,
        chuanHoaTienTrinh(tienTrinh),
        chuanHoaChuoi(buocHienTai, 'Bước hiện tại', 255)
    );
    if (!congViec) { throw taoLoi(409, 'Không thể cập nhật tiến trình của công việc.', MA_LOI.KHONG_THE_CAP_NHAT_TIEN_TRINH); }
    return congViec;
}

async function hoanThanh(id, data = {}) {
    const congViecId = parseId(id);
    const congViec = await repository.hoanThanh(congViecId, {
        tepKetQuaId: data.tepKetQuaId ? parseId(data.tepKetQuaId, 'ID tệp kết quả') : null,
        phienBanKetQuaId: data.phienBanKetQuaId ? parseId(data.phienBanKetQuaId, 'ID phiên bản kết quả') : null,
        dauRa: chuanHoaObject(data.dauRa, 'Đầu ra')
    });
    if (!congViec) { throw taoLoi(409, 'Không thể hoàn thành công việc ở trạng thái hiện tại.', MA_LOI.KHONG_THE_HOAN_THANH_CONG_VIEC); }
    return congViec;
}

async function thatBai(id, error = {}) {
    const congViecId = parseId(id);
    const congViec = await repository.thatBai(congViecId, {
        maLoi: chuanHoaChuoi(error.maLoi || error.code || 'LOI_XU_LY', 'Mã lỗi', 100, true),
        thongBaoLoi: chuanHoaChuoi(error.thongBaoLoi || error.message, 'Thông báo lỗi', 10000),
        chiTietLoi: error.chiTietLoi && typeof error.chiTietLoi === 'object' ? error.chiTietLoi : null
    });
    if (!congViec) { throw taoLoi(409, 'Không thể đánh dấu công việc thất bại.', MA_LOI.KHONG_THE_DANH_DAU_THAT_BAI); }
    return congViec;
}

async function danhDauDaHuy(id) {
    const congViecId = parseId(id);
    const congViec = await repository.danhDauDaHuy(congViecId);
    if (!congViec) { throw taoLoi(409, 'Công việc không ở trạng thái đang hủy.', MA_LOI.CONG_VIEC_KHONG_DANG_HUY); }
    return congViec;
}

async function capNhatBuoc(id, data = {}) {
    const buocId = parseId(id, 'ID bước công việc');
    if (data.trangThai) {
        const hopLe = [
            'CHO_XU_LY',
            'DANG_XU_LY',
            'HOAN_THANH',
            'THAT_BAI',
            'BO_QUA',
            'DA_HUY'
        ].includes(data.trangThai);
        if (!hopLe) { throw taoLoi(400, 'Trạng thái bước công việc không hợp lệ.', MA_LOI.TRANG_THAI_BUOC_KHONG_HOP_LE); }
    }
    const buoc = await repository.capNhatBuoc(buocId, {
        ...data,
        tienTrinh: data.tienTrinh === undefined ? undefined : chuanHoaTienTrinh(data.tienTrinh)
    });
    if (!buoc) { throw taoLoi(404, 'Bước công việc không tồn tại.', MA_LOI.BUOC_CONG_VIEC_KHONG_TIM_THAY); }
    return buoc;
}

module.exports = {
    taoCongViec,
    getDanhSach,
    getChiTiet,
    huy,
    ganQueue,
    capNhatTrangThai,
    capNhatTienTrinh,
    hoanThanh,
    thatBai,
    danhDauDaHuy,
    capNhatBuoc
};