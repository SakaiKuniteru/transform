'use strict';
const service = require('./tep.service');
const { taoViewContext, taoPagination } = require('../../../core/views/view-context');

function taoFilters(query = {}) {
    return {
        tuKhoa: String(query.tuKhoa || query.q || ''),
        nguoiDungId: String(query.nguoiDungId || ''),
        trangThai: String(query.trangThai || ''),
        dinhDang: String(query.dinhDang || ''),
        tuNgay: String(query.tuNgay || ''),
        denNgay: String(query.denNgay || '')
    };
}

async function index(req, res, next) {
    try {
        const ketQua = await service.layDanhSach(req, req.query);
        const filters = taoFilters(req.query);
        const tepDangChon = req.query.id ? await service.layChiTiet(req, req.query.id) : null;
        const pagination = taoPagination({ page: ketQua.phanTrang.page, totalPages: ketQua.phanTrang.totalPages, baseUrl: '/admin/tep', query: filters });
        const data = taoViewContext(req, res, {
            layout: 'admin',
            page: { title: 'Quản lý tệp | Transform Admin' },
            breadcrumb: [ { label: 'Quản trị', url: '/admin' }, { label: 'Tệp', current: true } ],
            danhSach: ketQua.danhSach,
            phanTrang: ketQua.phanTrang,
            pagination,
            filters,
            trangThaiOptions: service.TRANG_THAI_OPTIONS,
            tepDangChon
        });
        return res.render('pages/admin/tep/index', data);
    } catch (error) { return next(error); }
}

async function xoaPost(req, res, next) {
    try {
        await service.xoa(req, req.params.id);
        req.flash('success', 'Xóa tệp thành công.');
        return res.redirect(303, '/admin/tep');
    } catch (error) {
        if (Number(error?.statusCode || 500) < 500) { req.flash('error', error.message || 'Không thể xóa tệp.'); return res.redirect(303, `/admin/tep?id=${req.params.id}`); }
        return next(error);
    }
}

module.exports = {
    index,
    xoaPost
};