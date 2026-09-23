'use strict';

const service = require('./goi-dich-vu.service');
const { renderForm } = require('../../../core/forms/form-renderer');
const { batBuocHopLe } = require('../../../core/forms/form-validator');
const { FormError } = require('../../../core/forms/form-error');
const { taoViewContext, taoPagination } = require('../../../core/views/view-context');
const { taoGoiForm } = require('./forms/tao-goi.form');
const { taoCapNhatGoiForm } = require('./forms/cap-nhat-goi.form');

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
        active: String(query.active ?? ''),
        chuKy: String(query.chuKy || ''),
        yeuCauThanhToan: String(query.yeuCauThanhToan ?? '')
    };
}

function taoGiaTriGoi(goi) {
    return {
        ma: goi.ma,
        ten: goi.ten,
        moTa: goi.moTa || '',
        gia: goi.gia,
        tienTe: goi.tienTe,
        yeuCauThanhToan: goi.yeuCauThanhToan,
        chuKy: goi.chuKy,
        soChuKy: goi.soChuKy,
        thuTu: goi.thuTu,
        active: goi.active
    };
}

async function renderTrang(req, res, options = {}) {
    const ketQua = await service.layDanhSach(req, req.query);
    const filters = taoFilters(req.query);
    const goiDangChon = options.goiDangChon || (req.query.id ? await service.layChiTiet(req, req.query.id) : null);
    const pagination = taoPagination({
        page: ketQua.phanTrang.page,
        totalPages: ketQua.phanTrang.totalPages,
        baseUrl: '/admin/goi-dich-vu',
        query: filters
    });
    const capNhatForm = goiDangChon ? taoCapNhatGoiForm({
        id: goiDangChon.id
    }) : null;
    const data = taoViewContext(req, res, {
        layout: 'admin',
        page: {
            title: 'Gói dịch vụ | Transform Admin'
        },
        breadcrumb: [
            {
                label: 'Quản trị',
                url: '/admin'
            },
            {
                label: 'Gói dịch vụ',
                current: true
            }
        ],
        danhSach: ketQua.danhSach,
        phanTrang: ketQua.phanTrang,
        pagination,
        filters,
        chuKyOptions: service.CHU_KY_OPTIONS,
        goiDangChon,
        taoGoiForm: renderForm(taoGoiForm, options.taoState || {}, {
            csrfToken: res.locals.csrfToken
        }),
        capNhatGoiForm: capNhatForm ? renderForm(capNhatForm, options.capNhatState || {
            values: taoGiaTriGoi(goiDangChon)
        }, {
            csrfToken: res.locals.csrfToken
        }) : null
    });
    return res.status(options.statusCode || 200).render('pages/admin/goi-dich-vu/index', data);
}

async function index(req, res, next) {
    try { return await renderTrang(req, res); } catch (error) { return next(error); }
}

async function taoPost(req, res, next) {
    try {
        const values = await batBuocHopLe(taoGoiForm, req.body, {
            req
        });
        const goi = await service.taoMoi(req, values);
        req.flash('success', 'Tạo gói dịch vụ thành công.');
        return res.redirect(303, `/admin/goi-dich-vu?id=${goi.id}`);
    } catch (error) {
        if (Number(error?.statusCode || 400) >= 500) { return next(error); }
        try { return await renderTrang(req, res, { statusCode: Number(error?.statusCode || 400), taoState: taoFormState(req.body, error) }); } catch (renderError) { return next(renderError); }
    }
}

async function capNhatPost(req, res, next) {
    let goi;
    try {
        goi = await service.layChiTiet(req, req.params.id);
        const form = taoCapNhatGoiForm({
            id: goi.id
        });
        const values = await batBuocHopLe(form, req.body, {
            req,
            goi
        });
        await service.capNhat(req, goi.id, values);
        req.flash('success', 'Cập nhật gói dịch vụ thành công.');
        return res.redirect(303, `/admin/goi-dich-vu?id=${goi.id}`);
    } catch (error) {
        if (Number(error?.statusCode || 400) >= 500) { return next(error); }
        try {
            goi = goi || await service.layChiTiet(req, req.params.id);
            return await renderTrang(req, res, {
                statusCode: Number(error?.statusCode || 400),
                goiDangChon: goi,
                capNhatState: taoFormState(req.body, error)
            });
        } catch (renderError) { return next(renderError); }
    }
}

async function trangThaiPost(req, res, next) {
    try {
        const active = String(req.body?.active) === 'true';
        await service.capNhatTrangThai(req, req.params.id, active);
        req.flash('success', active ? 'Kích hoạt gói dịch vụ thành công.' : 'Ngừng kích hoạt gói dịch vụ thành công.');
        return res.redirect(303, `/admin/goi-dich-vu?id=${req.params.id}`);
    } catch (error) {
        if (Number(error?.statusCode || 500) < 500) {
            req.flash('error', error.message || 'Không thể cập nhật trạng thái gói dịch vụ.');
            return res.redirect(303, `/admin/goi-dich-vu?id=${req.params.id}`);
        }
        return next(error);
    }
}

async function xoaPost(req, res, next) {
    try {
        await service.xoa(req, req.params.id);
        req.flash('success', 'Xóa gói dịch vụ thành công.');
        return res.redirect(303, '/admin/goi-dich-vu');
    } catch (error) {
        if (Number(error?.statusCode || 500) < 500) {
            req.flash('error', error.message || 'Không thể xóa gói dịch vụ.');
            return res.redirect(303, `/admin/goi-dich-vu?id=${req.params.id}`);
        }
        return next(error);
    }
}

module.exports = {
    index,
    taoPost,
    capNhatPost,
    trangThaiPost,
    xoaPost
};