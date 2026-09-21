'use strict';

const service = require('./chuyen-doi.service');
const nhatKyService = require('../nhat-ky/nhat-ky.service');
const MA_LOI = require('../../constants/ma-loi');
const { loiChuaXacThuc } = require('../../utils/loi');

function thanhCong(res, { statusCode = 200, message = null, data = null } = {}) { return res.status(statusCode).json({ success: true, message, data, error: null }); }

function layChuThe(req) {
    if (req.user?.id) { return { nguoiDungId: req.user.id }; }
    if (req.phienKhach?.id || req.phienKhachId) { return { phienKhachId: req.phienKhach?.id || req.phienKhachId }; }
    throw loiChuaXacThuc('Không xác định được chủ sở hữu yêu cầu chuyển đổi.', MA_LOI.KHONG_XAC_DINH_DUOC_CHU_SO_HUU_CONG_VIEC);
}

async function getHoTro(req, res, next) {
    try { return thanhCong(res, { data: await service.getHoTro(req.query) }); } catch (error) { return next(error); }
}

async function tao(req, res, next) {
    try {
        const data = await service.taoYeuCau({
            ...req.body,
            khoaIdempotency: req.get('idempotency-key') || req.body.khoaIdempotency || null
        }, layChuThe(req));
        await nhatKyService.ghiTuRequestAnToan(req, {
            mucDo: nhatKyService.MUC_DO_NHAT_KY.AUDIT,
            nguon: 'CHUYEN_DOI',
            maSuKien: data.daTonTai ? 'CHUYEN_DOI_IDEMPOTENCY_HIT' : 'CHUYEN_DOI_DA_TAO',
            congViecId: data.congViec?.id || null,
            tepId: data.congViec?.tepNguonId || null,
            thongDiep: data.daTonTai ? 'Yêu cầu chuyển đổi trùng idempotency key.' : 'Đã tạo yêu cầu chuyển đổi.',
            duLieu: {
                daTonTai: data.daTonTai === true,
                queueName: data.queue?.queueName || null,
                queueJobId: data.queue?.id || null,
                dinhDangNguon: data.congViec?.dinhDangNguon || null,
                dinhDangDich: data.congViec?.dinhDangDich || null
            }
        });
        return thanhCong(res, {
            statusCode: data.daTonTai ? 200 : 201,
            message: data.daTonTai ? 'Yêu cầu chuyển đổi đã tồn tại.' : 'Đã tạo yêu cầu chuyển đổi.',
            data
        });
    } catch (error) {
        await nhatKyService.ghiLoiTuRequestAnToan(req, error, {
            nguon: 'CHUYEN_DOI',
            maSuKien: 'CHUYEN_DOI_TAO_THAT_BAI',
            thongDiep: 'Tạo yêu cầu chuyển đổi thất bại.'
        });
        return next(error);
    }
}

async function getChiTiet(req, res, next) {
    try { return thanhCong(res, { data: await service.getChiTiet(req.params.id, layChuThe(req)) }); } catch (error) { return next(error); }
}

module.exports = {
    getHoTro,
    tao,
    getChiTiet
};