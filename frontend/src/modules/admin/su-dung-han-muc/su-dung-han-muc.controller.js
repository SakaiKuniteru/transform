'use strict';

const service = require('./su-dung-han-muc.service');

const { taoViewContext } = require('../../../core/views/view-context');

async function renderTrang(req, res, options = {}) {
    const nguoiDungIdRaw = options.nguoiDungId ?? req.query.nguoiDungId;
    const nguoiDungId = service.chuanHoaId(nguoiDungIdRaw);
    const nguoiDungOptions = await service.layNguoiDungOptions(req, req.query.tuKhoaNguoiDung || '');
    let tongQuan = options.tongQuan || null;
    let traCuuError = options.traCuuError || null;
    if (nguoiDungId && !tongQuan && !traCuuError) {
        try { tongQuan = await service.layTongQuanNguoiDung(req, nguoiDungId); } catch (error) {
            if (Number(error?.statusCode || 500) >= 500) { throw error; }
            traCuuError = error.message || 'Không thể tra cứu hạn mức người dùng.';
        }
    }
    if (nguoiDungIdRaw && !nguoiDungId) { traCuuError = 'ID người dùng không hợp lệ.'; }
    const data = taoViewContext(req, res, {
        layout: 'admin',
        page: {
            title: 'Sử dụng hạn mức | Transform Admin'
        },
        breadcrumb: [
            {
                label: 'Quản trị',
                url: '/admin'
            },
            {
                label: 'Sử dụng hạn mức',
                current: true
            }
        ],
        nguoiDungId,
        nguoiDungOptions,
        tongQuan,
        traCuuError,
        maHanMuc: service.MA_HAN_MUC,
        tuKhoaNguoiDung: String(req.query.tuKhoaNguoiDung || '')
    });
    return res.status(options.statusCode || 200).render('pages/admin/su-dung-han-muc/index', data);
}

async function index(req, res, next) {
    try { return await renderTrang(req, res); } catch (error) { return next(error); }
}

async function chiTiet(req, res, next) {
    try {
        const chiTietHanMuc = await service.layChiTiet(req, req.params.nguoiDungId, req.params.maHanhDong);
        const data = taoViewContext(req, res, {
            layout: 'admin',
            page: {
                title: `${chiTietHanMuc.hanMuc.maHanhDongHienThi} | Transform Admin`
            },
            breadcrumb: [
                {
                    label: 'Quản trị',
                    url: '/admin'
                },
                {
                    label: 'Sử dụng hạn mức',
                    url: `/admin/su-dung-han-muc?nguoiDungId=${req.params.nguoiDungId}`
                },
                {
                    label: chiTietHanMuc.hanMuc.maHanhDongHienThi,
                    current: true
                }
            ],
            chiTietHanMuc
        });
        return res.render('pages/admin/su-dung-han-muc/chi-tiet', data);
    } catch (error) { return next(error); }
}

module.exports = {
    index,
    chiTiet
};