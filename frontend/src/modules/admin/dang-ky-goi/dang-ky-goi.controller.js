'use strict';

const service = require('./dang-ky-goi.service');
const { taoViewContext, taoPagination } = require('../../../core/views/view-context');

function taoFilters(query = {}) {
    return {
        tuKhoa: String(query.tuKhoa || query.q || ''),
        nguoiDungId: String(query.nguoiDungId || ''),
        goiDichVuId: String(query.goiDichVuId || ''),
        trangThai: String(query.trangThai || ''),
        nguonKichHoat: String(query.nguonKichHoat || ''),
        tuNgay: String(query.tuNgay || ''),
        denNgay: String(query.denNgay || '')
    };
}

async function renderTrang(req, res, options = {}) {
    const [ ketQua, goiOptions, nguoiDungOptions ] = await Promise.all([
        service.layDanhSach(req, req.query),
        service.layGoiOptions(req),
        service.layNguoiDungOptions(req, req.query.tuKhoaNguoiDung || '')
    ]);
    const filters = taoFilters(req.query);
    const dangKyDangChon = options.dangKyDangChon || (req.query.id ? await service.layChiTiet(req, req.query.id) : null);
    const pagination = taoPagination({
        page: ketQua.phanTrang.page,
        totalPages: ketQua.phanTrang.totalPages,
        baseUrl: '/admin/dang-ky-goi',
        query: filters
    });
    const data = taoViewContext(req, res, {
        layout: 'admin',
        page: {
            title: 'Đăng ký gói | Transform Admin'
        },
        breadcrumb: [
            {
                label: 'Quản trị',
                url: '/admin'
            },
            {
                label: 'Đăng ký gói',
                current: true
            }
        ],
        danhSach: ketQua.danhSach,
        phanTrang: ketQua.phanTrang,
        pagination,
        filters,
        trangThaiOptions: service.TRANG_THAI_OPTIONS,
        nguonKichHoatOptions: service.NGUON_KICH_HOAT_OPTIONS,
        goiOptions,
        nguoiDungOptions,
        dangKyDangChon
    });
    return res.status(options.statusCode || 200).render('pages/admin/dang-ky-goi/index', data);
}

async function index(req, res, next) {
    try { return await renderTrang(req, res); } catch (error) { return next(error); }
}

async function chiTiet(req, res, next) {
    try {
        const dangKyDangChon = await service.layChiTiet(req, req.params.id);
        return await renderTrang(req, res, {
            dangKyDangChon
        });
    } catch (error) { return next(error); }
}

async function ganGoiPost(req, res, next) {
    try {
        const dangKy = await service.ganGoi(req, {
            ...req.body,
            thayTheGoiHienTai: [ true, 'true', '1', 'on' ].includes(req.body?.thayTheGoiHienTai)
        });
        req.flash('success', 'Gán gói dịch vụ cho người dùng thành công.');
        return res.redirect(303, `/admin/dang-ky-goi?id=${dangKy.id}`);
    } catch (error) {
        if (Number(error?.statusCode || 500) < 500) {
            req.flash('error', error.message || 'Không thể gán gói dịch vụ.');
            return res.redirect(303, '/admin/dang-ky-goi');
        }
        return next(error);
    }
}

async function kichHoatPost(req, res, next) {
    try {
        await service.kichHoat(req, req.params.id, {
            ...req.body,
            thayTheGoiHienTai: [ true, 'true', '1', 'on' ].includes(req.body?.thayTheGoiHienTai)
        });
        req.flash('success', 'Kích hoạt gói dịch vụ thành công.');
        return res.redirect(303, `/admin/dang-ky-goi?id=${req.params.id}`);
    } catch (error) {
        if (Number(error?.statusCode || 500) < 500) {
            req.flash('error', error.message || 'Không thể kích hoạt gói dịch vụ.');
            return res.redirect(303, `/admin/dang-ky-goi?id=${req.params.id}`);
        }
        return next(error);
    }
}

async function tamDungPost(req, res, next) {
    try {
        await service.tamDung(req, req.params.id);
        req.flash('success', 'Tạm dừng gói dịch vụ thành công.');
        return res.redirect(303, `/admin/dang-ky-goi?id=${req.params.id}`);
    } catch (error) {
        if (Number(error?.statusCode || 500) < 500) {
            req.flash('error', error.message || 'Không thể tạm dừng gói dịch vụ.');
            return res.redirect(303, `/admin/dang-ky-goi?id=${req.params.id}`);
        }
        return next(error);
    }
}

async function tiepTucPost(req, res, next) {
    try {
        await service.tiepTuc(req, req.params.id);
        req.flash('success', 'Tiếp tục gói dịch vụ thành công.');
        return res.redirect(303, `/admin/dang-ky-goi?id=${req.params.id}`);
    } catch (error) {
        if (Number(error?.statusCode || 500) < 500) {
            req.flash('error', error.message || 'Không thể tiếp tục gói dịch vụ.');
            return res.redirect(303, `/admin/dang-ky-goi?id=${req.params.id}`);
        }
        return next(error);
    }
}

async function huyPost(req, res, next) {
    try {
        await service.huy(req, req.params.id, req.body);
        req.flash('success', 'Hủy đăng ký gói thành công.');
        return res.redirect(303, `/admin/dang-ky-goi?id=${req.params.id}`);
    } catch (error) {
        if (Number(error?.statusCode || 500) < 500) {
            req.flash('error', error.message || 'Không thể hủy đăng ký gói.');
            return res.redirect(303, `/admin/dang-ky-goi?id=${req.params.id}`);
        }
        return next(error);
    }
}

module.exports = {
    index,
    chiTiet,
    ganGoiPost,
    kichHoatPost,
    tamDungPost,
    tiepTucPost,
    huyPost
};