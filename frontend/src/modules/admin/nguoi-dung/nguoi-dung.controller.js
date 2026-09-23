'use strict';

const service = require('./nguoi-dung.service');
const { renderForm } = require('../../../core/forms/form-renderer');
const { batBuocHopLe } = require('../../../core/forms/form-validator');
const { FormError } = require('../../../core/forms/form-error');
const { taoViewContext, taoPagination } = require('../../../core/views/view-context');
const { taoNguoiDungForm } = require('./forms/tao-nguoi-dung.form');
const { taoCapNhatNguoiDungForm } = require('./forms/cap-nhat-nguoi-dung.form');

function taoFormState(values = {}, error = null) {
    if (!error) { return { values }; }
    const formError = error instanceof FormError ? error : FormError.tuApiError(error);
    return {
        values,
        errors: formError.errors,
        globalErrors: formError.globalErrors,
        submitted: true,
        valid: false
    };
}

function taoFilters(query = {}) {
    return {
        tuKhoa: String(query.tuKhoa || query.q || ''),
        loaiTaiKhoan: String(query.loaiTaiKhoan || ''),
        trangThai: String(query.trangThai || '')
    };
}

function laChinhMinh(req, nguoiDung) { return Number(req.authContext?.nguoiDung?.id) === Number(nguoiDung?.id); }

function taoCapNhatForm(req, nguoiDung) {
    return taoCapNhatNguoiDungForm({
        id: nguoiDung.id,
        loaiTaiKhoan: nguoiDung.loaiTaiKhoan,
        khoaLoaiTaiKhoan: laChinhMinh(req, nguoiDung)
    });
}

async function renderDanhSach(req, res, options = {}) {
    const ketQua = await service.layDanhSach(req, req.query);
    const filters = taoFilters(req.query);
    const pagination = taoPagination({
        page: ketQua.phanTrang.page,
        totalPages: ketQua.phanTrang.totalPages,
        baseUrl: '/admin/nguoi-dung',
        query: filters
    });
    const data = taoViewContext(req, res, {
        layout: 'admin',
        page: {
            title: 'Quản lý người dùng | Transform'
        },
        breadcrumb: [
            {
                label: 'Quản trị',
                url: '/admin'
            },
            {
                label: 'Người dùng',
                current: true
            }
        ],
        danhSach: ketQua.danhSach,
        phanTrang: ketQua.phanTrang,
        pagination,
        filters,
        loaiTaiKhoanOptions: service.LOAI_TAI_KHOAN_OPTIONS,
        trangThaiOptions: service.TRANG_THAI_OPTIONS,
        taoNguoiDungForm: renderForm(taoNguoiDungForm, options.taoState || {}, {
            csrfToken: res.locals.csrfToken
        })
    });
    return res.status(options.statusCode || 200).render('pages/admin/nguoi-dung/index', data);
}

async function renderChiTiet(req, res, nguoiDung, options = {}) {
    const chinhMinh = laChinhMinh(req, nguoiDung);
    const coTheQuanLy = !nguoiDung.laHeThong;
    const form = coTheQuanLy ? taoCapNhatForm(req, nguoiDung) : null;
    const state = options.capNhatState || {
        values: {
            email: nguoiDung.email,
            tenDangNhap: nguoiDung.tenDangNhap || '',
            hoTen: nguoiDung.hoTen,
            loaiTaiKhoan: nguoiDung.loaiTaiKhoan
        }
    };
    const data = taoViewContext(req, res, {
        layout: 'admin',
        page: {
            title: `${nguoiDung.hoTen || nguoiDung.email} | Transform Admin`
        },
        breadcrumb: [
            {
                label: 'Quản trị',
                url: '/admin'
            },
            {
                label: 'Người dùng',
                url: '/admin/nguoi-dung'
            },
            {
                label: nguoiDung.hoTen || nguoiDung.email,
                current: true
            }
        ],
        nguoiDung,
        laChinhMinh: chinhMinh,
        coTheQuanLy,
        coTheDoiTrangThai: coTheQuanLy && !chinhMinh,
        coTheXoa: coTheQuanLy && !chinhMinh,
        trangThaiOptions: service.TRANG_THAI_OPTIONS,
        capNhatNguoiDungForm: form ? renderForm(form, state, {
            csrfToken: res.locals.csrfToken
        }) : null
    });
    return res.status(options.statusCode || 200).render('pages/admin/nguoi-dung/chi-tiet', data);
}

async function index(req, res, next) {
    try { return await renderDanhSach(req, res); } catch (error) { return next(error); }
}

async function taoPost(req, res, next) {
    try {
        const values = await batBuocHopLe(taoNguoiDungForm, req.body, {
            req
        });
        const nguoiDung = await service.taoMoi(req, values);
        req.flash('success', 'Tạo người dùng thành công.');
        return res.redirect(303, `/admin/nguoi-dung/${nguoiDung.id}`);
    } catch (error) {
        if (Number(error?.statusCode || 400) >= 500) { return next(error); }
        try { return await renderDanhSach(req, res, { statusCode: Number(error?.statusCode || 400), taoState: taoFormState(req.body, error) }); } catch (renderError) { return next(renderError); }
    }
}

async function chiTiet(req, res, next) {
    try {
        const nguoiDung = await service.layChiTiet(req, req.params.id);
        return await renderChiTiet(req, res, nguoiDung);
    } catch (error) { return next(error); }
}

async function capNhatPost(req, res, next) {
    let nguoiDung;
    try {
        nguoiDung = await service.layChiTiet(req, req.params.id);
        if (nguoiDung.laHeThong) { req.flash('error', 'Không thể cập nhật tài khoản hệ thống.'); return res.redirect(303, `/admin/nguoi-dung/${req.params.id}`); }
        const form = taoCapNhatForm(req, nguoiDung);
        const values = await batBuocHopLe(form, req.body, {
            req,
            nguoiDung
        });
        await service.capNhat(req, req.params.id, values);
        req.flash('success', 'Cập nhật người dùng thành công.');
        return res.redirect(303, `/admin/nguoi-dung/${req.params.id}`);
    } catch (error) {
        if (Number(error?.statusCode || 400) >= 500) { return next(error); }
        try {
            nguoiDung = nguoiDung || await service.layChiTiet(req, req.params.id);
            return await renderChiTiet(req, res, nguoiDung, {
                statusCode: Number(error?.statusCode || 400),
                capNhatState: taoFormState(req.body, error)
            });
        } catch (renderError) { return next(renderError); }
    }
}

async function trangThaiPost(req, res, next) {
    try {
        const trangThai = String(req.body?.trangThai || '').trim().toUpperCase();
        if (!service.laTrangThaiHopLe(trangThai)) { req.flash('error', 'Trạng thái người dùng không hợp lệ.'); return res.redirect(303, `/admin/nguoi-dung/${req.params.id}`); }
        await service.capNhatTrangThai(req, req.params.id, trangThai);
        req.flash('success', 'Cập nhật trạng thái người dùng thành công.');
        return res.redirect(303, `/admin/nguoi-dung/${req.params.id}`);
    } catch (error) {
        if (Number(error?.statusCode || 500) < 500) { req.flash('error', error.message || 'Không thể cập nhật trạng thái người dùng.'); return res.redirect(303, `/admin/nguoi-dung/${req.params.id}`); }
        return next(error);
    }
}

async function xoaPost(req, res, next) {
    try {
        await service.xoa(req, req.params.id);
        req.flash('success', 'Xóa người dùng thành công.');
        return res.redirect(303, '/admin/nguoi-dung');
    } catch (error) {
        if (Number(error?.statusCode || 500) < 500) { req.flash('error', error.message || 'Không thể xóa người dùng.'); return res.redirect(303, `/admin/nguoi-dung/${req.params.id}`); }
        return next(error);
    }
}

module.exports = {
    index,
    taoPost,
    chiTiet,
    capNhatPost,
    trangThaiPost,
    xoaPost
};