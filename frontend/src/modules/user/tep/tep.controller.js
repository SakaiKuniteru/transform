'use strict';
const service = require('./tep.service');
const apiStream = require('../../../core/api/api-stream');
const { renderForm } = require('../../../core/forms/form-renderer');
const { batBuocHopLe } = require('../../../core/forms/form-validator');
const { FormError } = require('../../../core/forms/form-error');
const { taoViewContext, taoPagination } = require('../../../core/views/view-context');
const { uploadForm } = require('./forms/upload.form');
const { capNhatForm } = require('./forms/cap-nhat.form');

function taoFormState(values = {}, error = null) {
    if (!error) { return { values }; }
    const formError = error instanceof FormError ? error : FormError.tuApiError(error);
    return { values, errors: formError.errors, globalErrors: formError.globalErrors, submitted: true, valid: false };
}

async function index(req, res, next) {
    try {
        const ketQua = await service.layDanhSach(req, req.query);
        const pagination = taoPagination({ page: ketQua.phanTrang.trang, totalPages: ketQua.phanTrang.tongTrang, baseUrl: '/user/tep', query: { q: req.query.q || '', trangThai: req.query.trangThai || '' } });
        const data = taoViewContext(req, res, {
            layout: 'user',
            page: {
                title: 'Tệp của tôi | Transform'
            },
            breadcrumb: [
                {
                    label: 'Trang chủ',
                    url: '/'
                },
                {
                    label: 'Tệp của tôi',
                    current: true
                }
            ],
            danhSach: ketQua.danhSach,
            phanTrang: ketQua.phanTrang,
            pagination,
            filters: {
                q: req.query.q || '',
                trangThai: req.query.trangThai || ''
            },
            uploadForm: renderForm(uploadForm, {}, { csrfToken: res.locals.csrfToken })
        });
        return res.render('pages/user/tep/index', data);
    } catch (error) { return next(error); }
}

async function uploadPost(req, res, next) {
    try { const danhSach = await service.upload(req); req.flash('success', `Đã tải lên ${danhSach.length} tệp.`); return res.redirect(303, '/user/tep'); } catch (error) { if (Number(error?.statusCode || 500) >= 500) { return next(error); } req.flash('error', error.message || 'Không thể tải tệp lên.'); return res.redirect(303, '/user/tep'); }
}

async function chiTiet(req, res, next) {
    try {
        const tep = await service.layChiTiet(req, req.params.id);
        const data = taoViewContext(req, res, {
            layout: 'user',
            page: {
                title: `${tep.tenTep} | Transform`
            },
            breadcrumb: [
                {
                    label: 'Trang chủ',
                    url: '/'
                },
                {
                    label: 'Tệp của tôi',
                    url: '/user/tep'
                },
                {
                    label: tep.tenTep,
                    current: true
                }
            ],
            tep,
            capNhatForm: renderForm({ ...capNhatForm, action: `/user/tep/${tep.id}/cap-nhat` }, { values: { tenTep: tep.tenTep, moTa: tep.moTa || '' } }, { csrfToken: res.locals.csrfToken })
        });
        return res.render('pages/user/tep/chi-tiet', data);
    } catch (error) { return next(error); }
}

async function capNhatPost(req, res, next) {
    try { const values = await batBuocHopLe(capNhatForm, req.body, { req }); await service.capNhat(req, req.params.id, values); req.flash('success', 'Cập nhật thông tin tệp thành công.'); return res.redirect(303, `/user/tep/${req.params.id}`); } catch (error) {
        if (Number(error?.statusCode || 400) >= 500) { return next(error); }
        try {
            const tep = await service.layChiTiet(req, req.params.id);
            const data = taoViewContext(req, res, {
                layout: 'user',
                page: {
                    title: `${tep.tenTep} | Transform`
                },
                tep,
                capNhatForm: renderForm({ ...capNhatForm, action: `/user/tep/${tep.id}/cap-nhat` }, taoFormState(req.body, error), { csrfToken: res.locals.csrfToken })
            });
            return res.status(Number(error?.statusCode || 400)).render('pages/user/tep/chi-tiet', data);
        } catch (renderError) { return next(renderError); }
    }
}

async function xoaPost(req, res, next) {
    try { await service.xoa(req, req.params.id); req.flash('success', 'Xóa tệp thành công.'); return res.redirect(303, '/user/tep'); } catch (error) { return next(error); }
}

async function taiXuong(req, res, next) {
    try { const response = await service.layTaiXuong(req, req.params.id); return await apiStream.chuyenStream(response, res); } catch (error) { return next(error); }
}

module.exports = {
    index,
    uploadPost,
    chiTiet,
    capNhatPost,
    xoaPost,
    taiXuong
};