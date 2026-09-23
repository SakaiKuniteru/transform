'use strict';

const service = require('./goi-dich-vu.service');
const { taoViewContext, taoPagination } = require('../../../core/views/view-context');

function taoFilters(query = {}) {
    return {
        trangThai: String(query.trangThai || '')
    };
}

async function index(req, res, next) {
    try {
        const ketQua = await service.layTrang(req, req.query);
        const filters = taoFilters(req.query);
        const pagination = taoPagination({
            page: ketQua.lichSu.phanTrang.page,
            totalPages: ketQua.lichSu.phanTrang.totalPages,
            baseUrl: '/user/goi-dich-vu',
            query: filters
        });
        const data = taoViewContext(req, res, {
            layout: 'user',
            page: {
                title: 'Gói dịch vụ | Transform'
            },
            breadcrumb: [
                {
                    label: 'Trang chủ',
                    url: '/'
                },
                {
                    label: 'Gói dịch vụ',
                    current: true
                }
            ],
            hienTai: ketQua.hienTai,
            hanMuc: ketQua.hanMuc,
            lichSu: ketQua.lichSu.danhSach,
            pagination,
            filters,
            trangThaiOptions: Object.entries(service.TRANG_THAI).map(([ value, label ]) => ({
                value,
                label
            }))
        });
        return res.render('pages/user/goi-dich-vu/index', data);
    } catch (error) { return next(error); }
}

async function huyPost(req, res, next) {
    try {
        await service.huy(req, req.params.id, req.body);
        req.flash('success', 'Hủy gói dịch vụ thành công.');
        return res.redirect(303, '/user/goi-dich-vu');
    } catch (error) {
        if (Number(error?.statusCode || 500) < 500) {
            req.flash('error', error.message || 'Không thể hủy gói dịch vụ.');
            return res.redirect(303, '/user/goi-dich-vu');
        }
        return next(error);
    }
}

module.exports = {
    index,
    huyPost
};