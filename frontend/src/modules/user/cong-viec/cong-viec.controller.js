'use strict';

const service = require('./cong-viec.service');
const { taoViewContext, taoPagination } = require('../../../core/views/view-context');

function taoFilters(query = {}) {
    return {
        tuKhoa: String(query.tuKhoa || query.q || ''),
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
        const pagination = taoPagination({
            page: ketQua.phanTrang.trang,
            totalPages: ketQua.phanTrang.tongTrang,
            baseUrl: '/user/cong-viec',
            query: filters
        });
        const data = taoViewContext(req, res, {
            layout: 'user',
            page: {
                title: 'Công việc | Transform'
            },
            breadcrumb: [
                {
                    label: 'Trang chủ',
                    url: '/'
                },
                {
                    label: 'Công việc',
                    current: true
                }
            ],
            danhSach: ketQua.danhSach,
            phanTrang: ketQua.phanTrang,
            pagination,
            filters,
            trangThaiOptions: service.TRANG_THAI_OPTIONS,
            loaiCongViecOptions: service.LOAI_CONG_VIEC_OPTIONS
        });
        return res.render('pages/user/cong-viec/index', data);
    } catch (error) { return next(error); }
}

async function chiTiet(req, res, next) {
    try {
        const congViec = await service.layChiTiet(req, req.params.id);
        const data = taoViewContext(req, res, {
            layout: 'user',
            page: {
                title: `Công việc #${congViec.id} | Transform`
            },
            breadcrumb: [
                {
                    label: 'Trang chủ',
                    url: '/'
                },
                {
                    label: 'Công việc',
                    url: '/user/cong-viec'
                },
                {
                    label: `#${congViec.id}`,
                    current: true
                }
            ],
            congViec
        });
        return res.render('pages/user/cong-viec/chi-tiet', data);
    } catch (error) { return next(error); }
}

async function huyPost(req, res, next) {
    try {
        const congViec = await service.huy(req, req.params.id);
        req.flash('success', congViec.trangThai === 'DA_HUY' ? 'Hủy công việc thành công.' : 'Đã gửi yêu cầu hủy công việc.');
        return res.redirect(303, `/user/cong-viec/${req.params.id}`);
    } catch (error) {
        if (Number(error?.statusCode || 500) < 500) {
            req.flash('error', error.message || 'Không thể hủy công việc.');
            return res.redirect(303, `/user/cong-viec/${req.params.id}`);
        }
        return next(error);
    }
}

module.exports = {
    index,
    chiTiet,
    huyPost
};