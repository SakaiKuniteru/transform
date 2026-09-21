'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const repository = require('./tep.repository');
const lichSuService = require('../lich-su/lich-su.service');
const MA_LOI = require('../../constants/ma-loi');
const { taoLoiTheoStatus: taoLoi } = require('../../utils/loi');
const storageService = require('../../infrastructure/storage/storage.service');
const {
    giaoDich,
    ISOLATION_LEVEL
} = require('../../infrastructure/database/transaction');

function parseId(value) {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) { throw taoLoi(400, 'ID tệp không hợp lệ.', MA_LOI.ID_TEP_KHONG_HOP_LE); }
    return id;
}

function chuanHoaChuThe(chuThe = {}) {
    const coNguoiDung = chuThe.nguoiDungId !== undefined && chuThe.nguoiDungId !== null;
    const coPhienKhach = chuThe.phienKhachId !== undefined && chuThe.phienKhachId !== null;
    if (coNguoiDung === coPhienKhach) { throw taoLoi(400, 'Chủ sở hữu tệp không hợp lệ.', MA_LOI.CHU_SO_HUU_TEP_KHONG_HOP_LE); }
    return {
        nguoiDungId: coNguoiDung ? parseId(chuThe.nguoiDungId) : null,
        phienKhachId: coPhienKhach ? parseId(chuThe.phienKhachId) : null
    };
}

function chuanHoaTenTep(value) {
    const ten = path.basename(String(value || '').replaceAll('\\', '/')).trim();
    if (!ten) { throw taoLoi(400, 'Tên tệp không hợp lệ.', MA_LOI.TEN_TEP_KHONG_HOP_LE); }
    if (ten.length > 255) { throw taoLoi(400, 'Tên tệp không được vượt quá 255 ký tự.', MA_LOI.TEN_TEP_QUA_DAI); }
    return ten;
}

function layPhanMoRong(tenTep) {
    const extension = path.extname(tenTep).toLowerCase().replace(/^\./, '');
    if (!extension || extension.length > 32) { return null; }
    return extension;
}

async function tinhSha256(duongDan) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(duongDan);
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(hash.digest('hex')));
    });
}

async function taoThongTinUpload(file) {
    if (!file?.path) { throw taoLoi(400, 'Tệp upload không có đường dẫn tạm.', MA_LOI.TEP_UPLOAD_KHONG_HOP_LE); }
    const tenTep = chuanHoaTenTep(file.originalname);
    const stat = await fs.promises.stat(file.path);
    if (!stat.isFile()) { throw taoLoi(400, 'Dữ liệu upload không phải là tệp hợp lệ.', MA_LOI.TEP_UPLOAD_KHONG_HOP_LE); }
    const phanMoRong = layPhanMoRong(tenTep);
    return {
        file,
        tenTep,
        phanMoRong,
        dinhDang: phanMoRong,
        mimeType: file.mimetype || 'application/octet-stream',
        kichThuocBytes: stat.size,
        hashSha256: await tinhSha256(file.path),
        storageKey: storageService.taoKhoaLuuTru({
            loai: storageService.LOAI_THU_MUC.ORIGINAL,
            tenTep
        })
    };
}

async function xoaStorageDaTao(danhSach) {
    if (!Array.isArray(danhSach) || danhSach.length === 0) { return; }
    await Promise.allSettled(danhSach.map((item) => storageService.xoa(item.storageKey)));
}

async function upload(danhSachFile, chuThe) {
    const owner = chuanHoaChuThe(chuThe);
    if (!Array.isArray(danhSachFile) || danhSachFile.length === 0) { throw taoLoi(400, 'Không có tệp nào được tải lên.', MA_LOI.UPLOAD_KHONG_CO_TEP); }
    await storageService.damBaoSanSang();
    const danhSachThongTin = [];
    const danhSachDaLuuStorage = [];
    try {
        for (const file of danhSachFile) {
            const thongTin = await taoThongTinUpload(file);
            danhSachThongTin.push(thongTin);
            const storage = await storageService.luuTepUpload(file, {
                khoa: thongTin.storageKey,
                loai: storageService.LOAI_THU_MUC.ORIGINAL,
                metadata: {
                    tenTepGoc: thongTin.tenTep,
                    hashSha256: thongTin.hashSha256
                }
            });
            thongTin.storage = storage;
            danhSachDaLuuStorage.push(thongTin);
        }
        return await giaoDich(async (db) => {
            const ketQua = [];
            for (const thongTin of danhSachThongTin) {
                const tep = await repository.taoTep({
                    ...owner,
                    tenTep: thongTin.tenTep,
                    moTa: null,
                    nguonTao: 'UPLOAD',
                    trangThai: 'HOAT_DONG',
                    thuocTinh: {},
                    hetHanLuc: null
                }, db);
                const phienBan = await repository.taoPhienBan({
                    tepId: tep.id,
                    phienBanChaId: null,
                    congViecTaoId: null,
                    soPhienBan: 1,
                    loaiPhienBan: 'GOC',
                    tenTep: thongTin.tenTep,
                    phanMoRong: thongTin.phanMoRong,
                    dinhDang: thongTin.dinhDang,
                    mimeType: thongTin.mimeType,
                    kichThuocBytes: thongTin.kichThuocBytes,
                    hashSha256: thongTin.hashSha256,
                    storageDriver: thongTin.storage.driver,
                    storageBucket: thongTin.storage.bucket,
                    storageKey: thongTin.storage.khoa,
                    storageEtag: thongTin.storage.etag,
                    metadata: {
                        fieldName: thongTin.file.fieldname || null,
                        encoding: thongTin.file.encoding || null
                    },
                    trangThai: 'SAN_SANG',
                    hetHanLuc: null
                }, db);
                await lichSuService.ghiNhan({
                    ...owner,
                    tepId: tep.id,
                    phienBanTepId: phienBan.id,
                    loaiSuKien: lichSuService.LOAI_SU_KIEN.TEP_DA_TAI_LEN,
                    nguon: lichSuService.NGUON_LICH_SU.UPLOAD,
                    tieuDe: 'Tệp đã tải lên',
                    moTa: `Đã tải lên tệp "${thongTin.tenTep}".`,
                    duLieu: {
                        tenTep: thongTin.tenTep,
                        phanMoRong: thongTin.phanMoRong,
                        dinhDang: thongTin.dinhDang,
                        mimeType: thongTin.mimeType,
                        kichThuocBytes: thongTin.kichThuocBytes,
                        storageDriver: thongTin.storage.driver
                    }
                }, db);
                ketQua.push({
                    ...tep,
                    phienBanHienTai: phienBan
                });
            }
            return ketQua;
        }, {
            isolationLevel: ISOLATION_LEVEL.READ_COMMITTED
        });
    } catch (error) {
        await xoaStorageDaTao(danhSachDaLuuStorage);
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
        tuKhoa: String(query.tuKhoa || '').trim(),
        trangThai: query.trangThai || null
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
    const tepId = parseId(id);
    const owner = chuanHoaChuThe(chuThe);
    const tep = await repository.getChiTiet(tepId, owner);
    if (!tep) { throw taoLoi(404, 'Tệp không tồn tại hoặc không thuộc quyền sở hữu của bạn.', MA_LOI.TEP_KHONG_TIM_THAY); }
    return tep;
}

async function capNhat(id, chuThe, data = {}) {
    const tepId = parseId(id);
    const owner = chuanHoaChuThe(chuThe);
    await getChiTiet(tepId, owner);
    const duLieu = {
        tenTep: data.tenTep === undefined ? undefined : chuanHoaTenTep(data.tenTep),
        coMoTa: Object.prototype.hasOwnProperty.call(data, 'moTa'),
        moTa: data.moTa === null ? null : String(data.moTa || '').trim() || null,
        thuocTinh: data.thuocTinh
    };
    const row = await repository.capNhat(tepId, owner, duLieu);
    if (!row) { throw taoLoi(404, 'Tệp không tồn tại.', MA_LOI.TEP_KHONG_TIM_THAY); }
    return getChiTiet(tepId, owner);
}

async function getTaiXuong(id, chuThe) {
    const tep = await getChiTiet(id, chuThe);
    const phienBan = tep.phienBanHienTai;
    if (!phienBan || phienBan.trangThai !== 'SAN_SANG') { throw taoLoi(409, 'Tệp chưa sẵn sàng để tải xuống.', MA_LOI.TEP_CHUA_SAN_SANG); }
    const tonTai = await storageService.tonTai(phienBan.storageKey);
    if (!tonTai) { throw taoLoi(404, 'Dữ liệu vật lý của tệp không còn tồn tại.', MA_LOI.STORAGE_KHONG_TIM_THAY_TEP); }
    return {
        tep,
        phienBan,
        stream: await storageService.taoReadStream(phienBan.storageKey)
    };
}

async function xoa(id, chuThe) {
    const tepId = parseId(id);
    const owner = chuanHoaChuThe(chuThe);
    await getChiTiet(tepId, owner);
    const danhSachStorage = await repository.getDanhSachStorageKey(tepId, owner);
    const daXoa = await giaoDich(async (db) => repository.xoaMem(tepId, owner, db), {
        isolationLevel: ISOLATION_LEVEL.READ_COMMITTED
    });
    if (!daXoa) { throw taoLoi(404, 'Tệp không tồn tại.', MA_LOI.TEP_KHONG_TIM_THAY); }
    const ketQuaXoaStorage = await Promise.allSettled(danhSachStorage.map((item) => storageService.xoa(item.storageKey)));
    return {
        id: tepId,
        daXoa: true,
        storage: {
            tongSo: danhSachStorage.length,
            daXuLy: ketQuaXoaStorage.filter((item) => item.status === 'fulfilled').length,
            loi: ketQuaXoaStorage.filter((item) => item.status === 'rejected').length
        }
    };
}

module.exports = {
    upload,
    getDanhSach,
    getChiTiet,
    capNhat,
    getTaiXuong,
    xoa
};