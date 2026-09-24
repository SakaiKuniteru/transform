'use strict';
const service = require('./cong-viec.service');
const { taoViewContext, taoPagination } = require('../../../core/views/view-context');

function taoFilters(query = {}) {
    return {
        tuKhoa: String(query.tuKhoa || query.q || ''),
        nguoiDungId: String(query.nguoiDungId || ''),
        trangThai: String(query.trangThai || ''),
        loaiCongViec: String(query.loaiCongViec || ''),
        tuNgay: String(query.tuNgay || ''),
        denNgay: String(query.denNgay || '')
    };
}

async function index(req, res, next) {
    try {
        const ketQua = await service.layDanhSach(req, req.query);
        const filters = taoFilters(req.query);
        const congViecDangChon = req.query.id ? await service.layChiTiet(req, req.query.id) : null;
        const pagination = taoPagination({ page: ketQua.phanTrang.page, totalPages: ketQua.phanTrang.totalPages, baseUrl: '/admin/cong-viec', query: filters });
        const data = taoViewContext(req, res, {
            layout: 'admin',
            page: { title: 'Quản lý công việc | Transform Admin', noIndex: true },
            breadcrumb: [ { label: 'Quản trị', url: '/admin' }, { label: 'Công việc', current: true } ],
            danhSach: ketQua.danhSach,
            phanTrang: ketQua.phanTrang,
            pagination,
            filters,
            trangThaiOptions: service.TRANG_THAI_OPTIONS,
            loaiCongViecOptions: service.LOAI_CONG_VIEC_OPTIONS,
            congViecDangChon
        });
        return res.render('pages/admin/cong-viec/index', data);
    } catch (error) { return next(error); }
}

async function huyPost(req, res, next) {
    try {
        await service.huy(req, req.params.id);
        req.flash('success', 'Đã gửi yêu cầu hủy công việc.');
        return res.redirect(303, `/admin/cong-viec?id=${req.params.id}`);
    } catch (error) {
        if (Number(error?.statusCode || 500) < 500) { req.flash('error', error.message || 'Không thể hủy công việc.'); return res.redirect(303, `/admin/cong-viec?id=${req.params.id}`); }
        return next(error);
    }
}

module.exports = {
    index,
    huyPost
};