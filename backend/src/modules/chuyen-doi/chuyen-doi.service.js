'use strict';

const path = require('node:path');
const repository = require('./chuyen-doi.repository');
const congViecService = require('../cong-viec/cong-viec.service');
const congViecRepository = require('../cong-viec/cong-viec.repository');
const tepRepository = require('../tep/tep.repository');
const lichSuService = require('../lich-su/lich-su.service');
const nhatKyService = require('../nhat-ky/nhat-ky.service');
const queueService = require('../../infrastructure/queue/queue.service');
const storageService = require('../../infrastructure/storage/storage.service');
const planner = require('./engine/conversion-planner');
const registry = require('./engine/converter-registry');
const dinhDangService = require('./nhan-dien/dinh-dang.service');
const { TEN_QUEUE } = require('../../config/queue');
const { giaoDich, ISOLATION_LEVEL } = require('../../infrastructure/database/transaction');
const { LOAI_CHUYEN_DOI, coLoaiChuyenDoi, layThongTinLoaiChuyenDoi } = require('../../constants/loai-chuyen-doi');
const { chuanHoaDinhDang, coDinhDang, layThongTinDinhDang } = require('../../constants/dinh-dang-tep');
const MA_LOI = require('../../constants/ma-loi');
const { taoLoiTheoStatus: taoLoi } = require('../../utils/loi');

require('./hinh-anh/hinh-anh.converter');

const SO_BYTE_NHAN_DIEN = 65536;

function parseId(value, ten = 'ID') {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) { throw taoLoi(400, `${ten} không hợp lệ.`, MA_LOI.ID_KHONG_HOP_LE); }
    return id;
}

function chuanHoaChuThe(chuThe = {}) {
    const coNguoiDung = chuThe.nguoiDungId !== undefined && chuThe.nguoiDungId !== null;
    const coPhienKhach = chuThe.phienKhachId !== undefined && chuThe.phienKhachId !== null;
    if (coNguoiDung === coPhienKhach) { throw taoLoi(401, 'Không xác định được chủ sở hữu yêu cầu chuyển đổi.', MA_LOI.CHU_SO_HUU_CONG_VIEC_KHONG_HOP_LE); }
    return { nguoiDungId: coNguoiDung ? parseId(chuThe.nguoiDungId, 'ID người dùng') : null, phienKhachId: coPhienKhach ? parseId(chuThe.phienKhachId, 'ID phiên khách') : null };
}

function chuanHoaObject(value, ten = 'Dữ liệu') {
    if (value === undefined || value === null) { return {}; }
    if (!value || typeof value !== 'object' || Array.isArray(value)) { throw taoLoi(400, `${ten} phải là object.`, MA_LOI.DU_LIEU_KHONG_HOP_LE); }
    return value;
}

function chuanHoaLoaiChuyenDoi(value) {
    const loai = String(value || '').trim().toUpperCase();
    if (!coLoaiChuyenDoi(loai)) { throw taoLoi(400, 'Loại chuyển đổi không hợp lệ.', MA_LOI.CHUYEN_DOI_KHONG_HO_TRO); }
    return loai;
}

function chuanHoaDinhDangBatBuoc(value, ten) {
    const format = chuanHoaDinhDang(value);
    if (!format || !coDinhDang(format)) { throw taoLoi(415, `${ten} không được hỗ trợ.`, MA_LOI.TEP_DINH_DANG_KHONG_HO_TRO); }
    return format;
}

function chuanHoaDinhDangDich(value, loaiChuyenDoi, dinhDangNguon) {
    if (value === undefined || value === null || value === '') {
        if (loaiChuyenDoi === LOAI_CHUYEN_DOI.CHUYEN_DINH_DANG) { throw taoLoi(400, 'Chuyển đổi định dạng yêu cầu định dạng đích.', MA_LOI.CHUYEN_DOI_KHONG_HO_TRO); }
        return dinhDangNguon;
    }
    return chuanHoaDinhDangBatBuoc(value, 'Định dạng đích');
}

async function docMauStorage(storageKey, gioiHan = SO_BYTE_NHAN_DIEN) {
    if (typeof storageKey !== 'string' || !storageKey.trim()) { throw taoLoi(422, 'Phiên bản nguồn không có khóa lưu trữ hợp lệ.', MA_LOI.TEP_KHONG_THE_DOC); }
    const stream = await storageService.taoReadStream(storageKey);
    const chunks = [];
    let tong = 0;
    try {
        for await (const chunk of stream) {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            const conLai = gioiHan - tong;
            if (conLai <= 0) { break; }
            if (buffer.length <= conLai) { chunks.push(buffer); tong += buffer.length; } else { chunks.push(buffer.subarray(0, conLai)); tong += conLai; break; }
            if (tong >= gioiHan) { break; }
        }
        return Buffer.concat(chunks, tong);
    } finally { if (!stream.destroyed) { stream.destroy(); } }
}

async function nhanDienNguon(nguon) {
    const tonTai = await storageService.tonTai(nguon.storageKey);
    if (!tonTai) { throw taoLoi(404, 'Dữ liệu vật lý của tệp nguồn không còn tồn tại.', MA_LOI.STORAGE_KHONG_TIM_THAY_TEP); }
    const mau = await docMauStorage(nguon.storageKey);
    const nhanDien = dinhDangService.nhanDienTuBuffer(mau, { tenTep: nguon.tenTep, mimeType: nguon.mimeType, coToanBoBuffer: nguon.kichThuocBytes <= mau.length });
    const dinhDangNguon = chuanHoaDinhDangBatBuoc(nhanDien.dinhDang || nguon.dinhDang, 'Định dạng nguồn');
    return { ...nhanDien, dinhDang: dinhDangNguon, nhom: nhanDien.nhom || layThongTinDinhDang(dinhDangNguon)?.nhom || null };
}

function rutGonKeHoach(keHoach) {
    return {
        loaiChuyenDoi: keHoach.loaiChuyenDoi,
        nhomXuLy: keHoach.nhomXuLy,
        dinhDangNguon: keHoach.dinhDangNguon,
        dinhDangDich: keHoach.dinhDangDich,
        trucTiep: keHoach.trucTiep,
        chiPhi: keHoach.chiPhi,
        cacBuoc: keHoach.cacBuoc.map((item) => ({ thuTu: item.thuTu, converterKey: item.converterKey, dinhDangNguon: item.dinhDangNguon, dinhDangDich: item.dinhDangDich, chiPhi: item.chiPhi, engine: item.converter?.engine || null, phienBanEngine: item.converter?.phienBanEngine || null }))
    };
}

function chonQueue(loaiChuyenDoi, keHoach, nhomNguon) {
    if (loaiChuyenDoi === LOAI_CHUYEN_DOI.OCR) { return TEN_QUEUE.OCR; }
    if ([LOAI_CHUYEN_DOI.DICH, LOAI_CHUYEN_DOI.NHAN_DIEN_NGON_NGU].includes(loaiChuyenDoi)) { return TEN_QUEUE.DICH; }
    const nhom = String(keHoach.cacBuoc[0]?.converter?.nhomXuLy?.[0] || keHoach.nhomXuLy || nhomNguon || '').trim().toUpperCase();
    if (nhom === 'HINH_ANH') { return TEN_QUEUE.HINH_ANH; }
    if (nhom === 'TAI_LIEU' || nhom === 'VAN_BAN') { return TEN_QUEUE.TAI_LIEU; }
    if (nhom === 'DU_LIEU' || nhom === 'MA_HOA') { return TEN_QUEUE.DU_LIEU; }
    if (nhom === 'NEN' || nhom === 'TEP_NEN') { return TEN_QUEUE.NEN; }
    if (nhom === 'AI') { return TEN_QUEUE.AI; }
    return TEN_QUEUE.CHUYEN_DOI;
}

function taoDauVaoNguon(nguon, nhanDien) {
    return {
        tepId: nguon.tepId,
        phienBanId: nguon.phienBanId,
        tenTep: nguon.tenTep,
        dinhDangNguon: nhanDien.dinhDang,
        mimeType: nguon.mimeType,
        kichThuocBytes: nguon.kichThuocBytes,
        storageKey: nguon.storageKey,
        nhanDien: { nguonNhanDien: nhanDien.nguonNhanDien, doTinCay: nhanDien.doTinCay, canhBao: nhanDien.canhBao || [] }
    };
}

async function damBaoXepHang(congViecId, owner) {
    const chiTiet = await congViecService.getChiTiet(congViecId, owner);
    const buoc = chiTiet.cacBuoc?.[0];
    if (!buoc) { throw taoLoi(500, 'Công việc chuyển đổi không có bước thực thi.', MA_LOI.CHUYEN_DOI_THAT_BAI); }
    const tuyChon = { ...(chiTiet.tuyChon || {}), ...(buoc.tuyChon || {}) };
    let queue = buoc.queueJobId ? { id: buoc.queueJobId, queueName: buoc.queueName, daTonTai: true } : null;
    if (!queue && chiTiet.trangThai === 'CHO_XU_LY') {
        const loaiChuyenDoi = chuanHoaLoaiChuyenDoi(tuyChon.loaiChuyenDoi);
        const nhomXuLy = String(tuyChon.nhomXuLy || buoc.loaiBuoc || '').trim().toUpperCase() || null;
        const tenQueue = chonQueue(loaiChuyenDoi, { cacBuoc: [], nhomXuLy }, nhomXuLy);
        try {
            queue = await queueService.xepHangBuocCongViec({ buocId: buoc.id, congViecId: chiTiet.id, tenQueue, data: { loaiChuyenDoi, nhomXuLy, dinhDangNguon: tuyChon.dinhDangNguon || chiTiet.dinhDangNguon, dinhDangDich: tuyChon.dinhDangDich || chiTiet.dinhDangDich, converterKey: tuyChon.converterKey || null, keHoachConverterKeys: Array.isArray(tuyChon.keHoachConverterKeys) ? tuyChon.keHoachConverterKeys : [] }, mucDoUuTien: chiTiet.mucDoUuTien, soLanThuToiDa: chiTiet.soLanThuToiDa });
        } catch (error) {
            let daDanhDauThatBai = false;
            try {
                await congViecService.thatBai(chiTiet.id, {
                    maLoi: error?.maLoi || error?.code || MA_LOI.QUEUE_THEM_CONG_VIEC_THAT_BAI,
                    thongBaoLoi: error?.message || 'Không thể đưa công việc vào queue.',
                    chiTietLoi: { tenQueue }
                });
                daDanhDauThatBai = true;
            } catch (capNhatError) {
                error.capNhatCongViecError = capNhatError;
            }
            if (daDanhDauThatBai) {
                await lichSuService.ghiNhanAnToan({
                    nguoiDungId: chiTiet.nguoiDungId || null,
                    phienKhachId: chiTiet.phienKhachId || null,
                    congViecId: chiTiet.id,
                    tepId: chiTiet.tepNguonId || null,
                    phienBanTepId: chiTiet.phienBanNguonId || null,
                    loaiSuKien: lichSuService.LOAI_SU_KIEN.CHUYEN_DOI_THAT_BAI,
                    nguon: lichSuService.NGUON_LICH_SU.QUEUE,
                    tieuDe: 'Chuyển đổi thất bại',
                    moTa: 'Không thể đưa yêu cầu chuyển đổi vào hàng đợi.',
                    duLieu: {
                        tenQueue,
                        maLoi: error?.maLoi || error?.code || MA_LOI.QUEUE_THEM_CONG_VIEC_THAT_BAI
                    }
                });
            }
            await nhatKyService.ghiLoiAnToan(error, {
                nguon: 'QUEUE',
                maSuKien: 'CHUYEN_DOI_XEP_HANG_THAT_BAI',
                nguoiDungId: chiTiet.nguoiDungId || null,
                phienKhachId: chiTiet.phienKhachId || null,
                congViecId: chiTiet.id,
                tepId: chiTiet.tepNguonId || null,
                thongDiep: 'Không thể đưa yêu cầu chuyển đổi vào queue.',
                duLieu: { tenQueue }
            });
            throw error;
        }
    }
    return { congViec: await congViecService.getChiTiet(chiTiet.id, owner), queue, keHoach: tuyChon.keHoach || tuyChon.keHoachConverterKeys || null };
}

async function taoYeuCau(data = {}, chuThe) {
    const owner = chuanHoaChuThe(chuThe);
    const khoaIdempotency = String(data.khoaIdempotency || '').trim() || null;
    if (khoaIdempotency) {
        const hienTai = await congViecRepository.getByIdempotency(owner, khoaIdempotency);
        if (hienTai) {
            const daXepHang = await damBaoXepHang(hienTai.id, owner);
            return { daTonTai: true, ...daXepHang, chuyenDoi: await repository.getTheoCongViec(hienTai.id) };
        }
    }
    const tepNguonId = parseId(data.tepNguonId, 'ID tệp nguồn');
    const phienBanNguonId = data.phienBanNguonId ? parseId(data.phienBanNguonId, 'ID phiên bản nguồn') : null;
    const loaiChuyenDoi = chuanHoaLoaiChuyenDoi(data.loaiChuyenDoi);
    const tuyChonNguoiDung = chuanHoaObject(data.tuyChon, 'Tùy chọn chuyển đổi');
    const nguon = await congViecRepository.getNguonHopLe(tepNguonId, phienBanNguonId, owner);
    if (!nguon) { throw taoLoi(404, 'Tệp nguồn hoặc phiên bản nguồn không tồn tại hoặc không thuộc quyền sở hữu của bạn.', MA_LOI.TEP_NGUON_KHONG_HOP_LE); }
    const nhanDien = await nhanDienNguon(nguon);
    const dinhDangNguon = nhanDien.dinhDang;
    const dinhDangDich = chuanHoaDinhDangDich(data.dinhDangDich, loaiChuyenDoi, dinhDangNguon);
    const converterKey = String(data.converterKey || '').trim() || null;
    const keHoach = await planner.lapKeHoach({ loaiChuyenDoi, nhomXuLy: nhanDien.nhom, dinhDangNguon, dinhDangDich, converterKey, tuyChon: tuyChonNguoiDung });
    if (!keHoach?.cacBuoc?.length) { throw taoLoi(422, 'Không tạo được kế hoạch chuyển đổi phù hợp.', MA_LOI.CHUYEN_DOI_KHONG_TIM_THAY_DUONG_DI); }
    const keHoachRutGon = rutGonKeHoach(keHoach);
    const converterTrucTiep = keHoach.trucTiep === true && keHoach.cacBuoc.length === 1 ? keHoach.cacBuoc[0].converterKey : null;
    const tuyChon = { ...tuyChonNguoiDung, loaiChuyenDoi, dinhDangNguon, dinhDangDich, nhomXuLy: nhanDien.nhom, converterKey: converterKey || converterTrucTiep, keHoach: keHoachRutGon, keHoachConverterKeys: keHoach.cacBuoc.map((item) => item.converterKey) };
    const dauVao = taoDauVaoNguon(nguon, nhanDien);
    const thongTinLoai = layThongTinLoaiChuyenDoi(loaiChuyenDoi);
    const congViec = await congViecService.taoCongViec({
        khoaIdempotency,
        loaiCongViec: 'CHUYEN_DOI',
        mucDoUuTien: data.mucDoUuTien ?? 5,
        soLanThuToiDa: data.soLanThuToiDa ?? 3,
        tepNguonId: nguon.tepId,
        phienBanNguonId: nguon.phienBanId,
        dinhDangNguon,
        dinhDangDich,
        dauVao,
        tuyChon,
        cacBuoc: [{ maBuoc: 'THUC_THI_CHUYEN_DOI', tenBuoc: thongTinLoai?.ten || 'Thực thi chuyển đổi', loaiBuoc: nhanDien.nhom || 'CHUYEN_DOI', batBuoc: true, dauVao, tuyChon, soLanThuToiDa: data.soLanThuToiDa ?? 3 }]
    }, owner);
    if (!congViec.daTonTai) {
        await lichSuService.ghiNhanAnToan({
            ...owner,
            congViecId: congViec.id,
            tepId: nguon.tepId,
            phienBanTepId: nguon.phienBanId,
            loaiSuKien: lichSuService.LOAI_SU_KIEN.CHUYEN_DOI_DA_TAO,
            nguon: lichSuService.NGUON_LICH_SU.API,
            tieuDe: 'Đã tạo yêu cầu chuyển đổi',
            moTa: `Đã tạo yêu cầu chuyển đổi từ ${dinhDangNguon} sang ${dinhDangDich}.`,
            duLieu: {
                loaiChuyenDoi,
                dinhDangNguon,
                dinhDangDich,
                converterKey: converterKey || converterTrucTiep,
                mucDoUuTien: data.mucDoUuTien ?? 5
            }
        });
    }
    const daXepHang = await damBaoXepHang(congViec.id, owner);
    return { daTonTai: congViec.daTonTai === true, ...daXepHang, chuyenDoi: await repository.getTheoCongViec(congViec.id) };
}

async function getHoTro(query = {}) {
    const loai = query.loaiChuyenDoi ? chuanHoaLoaiChuyenDoi(query.loaiChuyenDoi) : null;
    const nguon = query.dinhDangNguon ? chuanHoaDinhDangBatBuoc(query.dinhDangNguon, 'Định dạng nguồn') : null;
    const dich = query.dinhDangDich ? chuanHoaDinhDangBatBuoc(query.dinhDangDich, 'Định dạng đích') : null;
    const nhom = String(query.nhomXuLy || '').trim().toUpperCase() || null;
    return registry.layDanhSachConverter().filter((converter) => {
        if (loai && !converter.loaiChuyenDoi.includes(loai)) { return false; }
        if (nguon && !converter.dinhDangNguon.includes('*') && !converter.dinhDangNguon.includes(nguon)) { return false; }
        if (dich && !converter.dinhDangDich.includes('*') && !converter.dinhDangDich.includes(dich)) { return false; }
        if (nhom && !converter.nhomXuLy.includes('*') && !converter.nhomXuLy.includes(nhom)) { return false; }
        return true;
    }).map((converter) => ({ key: converter.key, ten: converter.ten, loaiChuyenDoi: converter.loaiChuyenDoi, nhomXuLy: converter.nhomXuLy, dinhDangNguon: converter.dinhDangNguon, dinhDangDich: converter.dinhDangDich, uuTien: converter.uuTien, chiPhi: converter.chiPhi, engine: converter.engine, phienBanEngine: converter.phienBanEngine, metadata: converter.metadata || {} }));
}

async function getChiTiet(id, chuThe) {
    const congViecId = parseId(id, 'ID công việc');
    const owner = chuanHoaChuThe(chuThe);
    const congViec = await congViecService.getChiTiet(congViecId, owner);
    return { congViec, chuyenDoi: await repository.getTheoCongViec(congViecId) };
}

async function lapKeHoachTuCongViec(congViec, buoc = null) {
    const tuyChon = { ...(congViec.tuyChon || {}), ...(buoc?.tuyChon || {}) };
    const loaiChuyenDoi = chuanHoaLoaiChuyenDoi(tuyChon.loaiChuyenDoi);
    const dinhDangNguon = chuanHoaDinhDangBatBuoc(tuyChon.dinhDangNguon || congViec.dinhDangNguon, 'Định dạng nguồn');
    const dinhDangDich = chuanHoaDinhDangDich(tuyChon.dinhDangDich || congViec.dinhDangDich, loaiChuyenDoi, dinhDangNguon);
    return planner.lapKeHoach({ loaiChuyenDoi, nhomXuLy: tuyChon.nhomXuLy || buoc?.loaiBuoc || null, dinhDangNguon, dinhDangDich, converterKey: tuyChon.converterKey || null, tuyChon });
}

async function damBaoBanGhiLanXuLy(congViec, buoc, lanThu, keHoach) {
    const daCo = await repository.getTheoLanXuLy(congViec.id, lanThu);
    if (daCo.length === keHoach.cacBuoc.length) { return daCo; }
    return giaoDich(async (db) => {
        const ketQua = [];
        for (const item of keHoach.cacBuoc) {
            let banGhi = await repository.getTheoLan(congViec.id, item.thuTu, lanThu, db);
            if (!banGhi) {
                banGhi = await repository.tao({
                    congViecId: congViec.id,
                    buocCongViecId: buoc?.id || null,
                    thuTu: item.thuTu,
                    lanThu,
                    phienBanNguonId: congViec.phienBanNguonId || null,
                    phienBanKetQuaId: null,
                    dinhDangNguon: item.dinhDangNguon || keHoach.dinhDangNguon,
                    dinhDangDich: item.dinhDangDich || keHoach.dinhDangDich || keHoach.dinhDangNguon,
                    converterKey: item.converterKey,
                    engine: item.converter?.engine || null,
                    phienBanEngine: item.converter?.phienBanEngine || null,
                    trangThai: 'CHO_XU_LY',
                    tuyChon: { ...(congViec.tuyChon || {}), ...(buoc?.tuyChon || {}) },
                    metadata: { chiPhi: item.chiPhi, tongSoBuoc: keHoach.cacBuoc.length },
                    thongKe: {}
                }, db);
                if (!banGhi) { banGhi = await repository.getTheoLan(congViec.id, item.thuTu, lanThu, db); }
                if (!banGhi) { throw taoLoi(409, 'Không thể khởi tạo bản ghi chuyển đổi.', MA_LOI.CHUYEN_DOI_THAT_BAI); }
            }
            ketQua.push(banGhi);
        }
        return ketQua;
    }, { isolationLevel: ISOLATION_LEVEL.READ_COMMITTED });
}

async function batDauLanXuLy({ congViec, buoc = null, lanThu = 1 } = {}) {
    if (!congViec?.id) { throw new TypeError('Công việc chuyển đổi không hợp lệ.'); }
    const soLan = Number(lanThu);
    if (!Number.isSafeInteger(soLan) || soLan <= 0) { throw new TypeError('Lần thử chuyển đổi không hợp lệ.'); }
    const keHoach = await lapKeHoachTuCongViec(congViec, buoc);
    if (!keHoach?.cacBuoc?.length) { throw taoLoi(422, 'Không xác định được kế hoạch cho lần xử lý.', MA_LOI.CHUYEN_DOI_KHONG_TIM_THAY_DUONG_DI); }
    const danhSach = await damBaoBanGhiLanXuLy(congViec, buoc, soLan, keHoach);
    const daBatDau = [];
    for (let index = 0; index < danhSach.length; index += 1) {
        const banGhi = danhSach[index];
        const item = keHoach.cacBuoc[index];
        if (['HOAN_THANH', 'DA_HUY', 'THAT_BAI'].includes(banGhi.trangThai)) { daBatDau.push(banGhi); continue; }
        daBatDau.push(await repository.batDau(banGhi.id, { engine: item?.converter?.engine || banGhi.engine, phienBanEngine: item?.converter?.phienBanEngine || banGhi.phienBanEngine, metadata: { ...(banGhi.metadata || {}), keHoach: rutGonKeHoach(keHoach) } }) || banGhi);
    }
    return { keHoach, danhSach: daBatDau, lanThu: soLan };
}

function taoTenTepKetQua(congViec, dinhDang) {
    const tenNguon = congViec.phienBanNguon?.tenTep || congViec.tepNguon?.tenTep || 'tep';
    const tenGoc = path.parse(tenNguon).name || 'tep';
    const extension = dinhDang === 'jpeg' ? 'jpg' : dinhDang || 'bin';
    return `${tenGoc}-ket-qua.${extension}`;
}

async function taoTepKetQua(congViec, ketQua, db) {
    const dauRa = chuanHoaObject(ketQua?.dauRa, 'Đầu ra chuyển đổi');
    if (ketQua?.tepKetQuaId && ketQua?.phienBanKetQuaId) { return { tepKetQuaId: parseId(ketQua.tepKetQuaId, 'ID tệp kết quả'), phienBanKetQuaId: parseId(ketQua.phienBanKetQuaId, 'ID phiên bản kết quả'), dauRa }; }
    if (!dauRa.storageKey) { return { tepKetQuaId: null, phienBanKetQuaId: null, dauRa }; }
    if (!dauRa.storageDriver) { throw taoLoi(500, 'Đầu ra chuyển đổi thiếu storage driver.', MA_LOI.CHUYEN_DOI_KET_QUA_KHONG_HOP_LE); }
    const dinhDang = chuanHoaDinhDang(dauRa.dinhDang || congViec.dinhDangDich || congViec.dinhDangNguon) || null;
    const tenTep = taoTenTepKetQua(congViec, dinhDang);
    const owner = { nguoiDungId: congViec.nguoiDungId || null, phienKhachId: congViec.phienKhachId || null };
    const tep = await tepRepository.taoTep({ ...owner, tenTep, moTa: null, nguonTao: 'CONG_VIEC', trangThai: 'HOAT_DONG', thuocTinh: { congViecId: congViec.id }, hetHanLuc: congViec.hetHanLuc || null }, db);
    const phienBan = await tepRepository.taoPhienBan({
        tepId: tep.id,
        phienBanChaId: null,
        congViecTaoId: congViec.id,
        soPhienBan: 1,
        loaiPhienBan: 'KET_QUA',
        tenTep,
        phanMoRong: dinhDang === 'jpeg' ? 'jpg' : dinhDang,
        dinhDang,
        mimeType: dauRa.mimeType || null,
        kichThuocBytes: Number(dauRa.kichThuocBytes || 0),
        hashSha256: null,
        storageDriver: dauRa.storageDriver,
        storageBucket: dauRa.storageBucket || null,
        storageKey: dauRa.storageKey,
        storageEtag: dauRa.storageEtag || null,
        metadata: { ...(dauRa.metadata || {}), congViecId: congViec.id },
        trangThai: 'SAN_SANG',
        hetHanLuc: congViec.hetHanLuc || null
    }, db);
    return { tepKetQuaId: tep.id, phienBanKetQuaId: phienBan.id, dauRa: { ...dauRa, tepId: tep.id, phienBanId: phienBan.id, tenTep } };
}

function layThongKeBuoc(ketQua, thuTu) {
    const danhSach = ketQua?.thongKe?.engine?.cacBuoc;
    if (!Array.isArray(danhSach)) { return {}; }
    return danhSach.find((item) => Number(item.thuTu) === Number(thuTu)) || {};
}

async function hoanThanhLanXuLy(phienXuLy, { congViec, ketQua = {} } = {}) {
    if (!phienXuLy?.keHoach || !Array.isArray(phienXuLy.danhSach) || !phienXuLy.danhSach.length) { throw new TypeError('Phiên chuyển đổi không hợp lệ.'); }
    if (!congViec?.id) { throw new TypeError('Công việc chuyển đổi không hợp lệ.'); }
    const storageKey = ketQua?.dauRa?.storageKey || null;
    try {
        return await giaoDich(async (db) => {
            const ketQuaTep = await taoTepKetQua(congViec, ketQua, db);
            if (ketQuaTep.tepKetQuaId && ketQuaTep.phienBanKetQuaId) {
                await lichSuService.ghiNhan({
                    nguoiDungId: congViec.nguoiDungId || null,
                    phienKhachId: congViec.phienKhachId || null,
                    congViecId: congViec.id,
                    tepId: ketQuaTep.tepKetQuaId,
                    phienBanTepId: ketQuaTep.phienBanKetQuaId,
                    loaiSuKien: lichSuService.LOAI_SU_KIEN.TEP_KET_QUA_DA_TAO,
                    nguon: lichSuService.NGUON_LICH_SU.WORKER,
                    tieuDe: 'Đã tạo tệp kết quả',
                    moTa: `Đã tạo tệp kết quả định dạng ${ketQuaTep.dauRa?.dinhDang || congViec.dinhDangDich || 'không xác định'}.`,
                    duLieu: {
                        dinhDangNguon: congViec.dinhDangNguon,
                        dinhDangDich: ketQuaTep.dauRa?.dinhDang || congViec.dinhDangDich,
                        kichThuocBytes: ketQuaTep.dauRa?.kichThuocBytes || null
                    }
                }, db);
            }
            const danhSach = [];
            for (let index = 0; index < phienXuLy.danhSach.length; index += 1) {
                const banGhi = phienXuLy.danhSach[index];
                const item = phienXuLy.keHoach.cacBuoc[index];
                const laCuoi = index === phienXuLy.danhSach.length - 1;
                const daCapNhat = await repository.hoanThanh(banGhi.id, {
                    phienBanKetQuaId: laCuoi ? ketQuaTep.phienBanKetQuaId : null,
                    engine: item?.converter?.engine || banGhi.engine,
                    phienBanEngine: item?.converter?.phienBanEngine || banGhi.phienBanEngine,
                    metadata: { ...(banGhi.metadata || {}), ...(laCuoi ? { dauRa: ketQuaTep.dauRa } : {}) },
                    thongKe: layThongKeBuoc(ketQua, item?.thuTu || index + 1)
                }, db);
                if (!daCapNhat) { throw taoLoi(409, 'Không thể hoàn thành bản ghi chuyển đổi ở trạng thái hiện tại.', MA_LOI.CHUYEN_DOI_THAT_BAI); }
                danhSach.push(daCapNhat);
            }
            return { ...ketQua, tepKetQuaId: ketQuaTep.tepKetQuaId, phienBanKetQuaId: ketQuaTep.phienBanKetQuaId, dauRa: ketQuaTep.dauRa, chuyenDoi: danhSach };
        }, { isolationLevel: ISOLATION_LEVEL.READ_COMMITTED });
    } catch (error) {
        if (storageKey) { await storageService.xoa(storageKey).catch(() => {}); }
        throw error;
    }
}

async function thatBaiLanXuLy(phienXuLy, error = {}) {
    if (!phienXuLy?.danhSach || !Array.isArray(phienXuLy.danhSach)) { return []; }
    const maLoi = String(error.maLoi || error.code || MA_LOI.CHUYEN_DOI_THAT_BAI).slice(0, 100);
    const thongBaoLoi = String(error.message || 'Chuyển đổi thất bại.').slice(0, 10000);
    const ketQua = [];
    for (const banGhi of phienXuLy.danhSach) {
        if (['HOAN_THANH', 'DA_HUY', 'THAT_BAI'].includes(banGhi.trangThai)) { ketQua.push(banGhi); continue; }
        ketQua.push(await repository.thatBai(banGhi.id, { maLoi, thongBaoLoi, chiTietLoi: error.chiTiet || null, metadata: error.metadata || null }) || banGhi);
    }
    return ketQua;
}

async function huyLanXuLy(phienXuLy) {
    if (!phienXuLy?.danhSach || !Array.isArray(phienXuLy.danhSach)) { return []; }
    const ketQua = [];
    for (const banGhi of phienXuLy.danhSach) {
        if (['HOAN_THANH', 'DA_HUY', 'THAT_BAI'].includes(banGhi.trangThai)) { ketQua.push(banGhi); continue; }
        ketQua.push(await repository.huy(banGhi.id) || banGhi);
    }
    return ketQua;
}

module.exports = {
    taoYeuCau,
    getHoTro,
    getChiTiet,
    batDauLanXuLy,
    hoanThanhLanXuLy,
    thatBaiLanXuLy,
    huyLanXuLy
};