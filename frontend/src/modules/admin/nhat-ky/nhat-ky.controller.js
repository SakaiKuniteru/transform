'use strict';
const service = require('./nhat-ky.service');
const { taoViewContext, taoPagination } = require('../../../core/views/view-context');

function taoFilters(query = {}) {
    return {
        requestId: String(query.requestId || ''),
        traceId: String(query.traceId || ''),
        congViecId: String(query.congViecId || ''),
        nguoiDungId: String(query.nguoiDungId || ''),
        event: String(query.event || ''),
        level: String(query.level || ''),
        tuNgay: String(query.tuNgay || ''),
        denNgay: String(query.denNgay || '')
    };
}

async function index(req, res, next) {
    try {
        const ketQua = await service.layDanhSach(req, req.query);
        const filters = taoFilters(req.query);
        const pagination = taoPagination({ page: ketQua.phanTrang.page, totalPages: ketQua.phanTrang.totalPages, baseUrl: '/admin/nhat-ky', query: filters });
        const data = taoViewContext(req, res, {
            layout: 'admin',
            page: { title: 'Nhật ký hệ thống | Transform Admin', noIndex: true },
            breadcrumb: [ { label: 'Quản trị', url: '/admin' }, { label: 'Nhật ký hệ thống', current: true } ],
            danhSach: ketQua.danhSach,
            phanTrang: ketQua.phanTrang,
            pagination,
            filters,
            levelOptions: service.LEVEL_OPTIONS
        });
        return res.render('pages/admin/nhat-ky/index', data);
    } catch (error) { return next(error); }
}

module.exports = {
    index
};