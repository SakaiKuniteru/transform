'use strict';

const service = require('./tai-khoan.service');
const { renderForm } = require('../../../core/forms/form-renderer');
const { batBuocHopLe } = require('../../../core/forms/form-validator');
const { FormError } = require('../../../core/forms/form-error');
const { taoViewContext } = require('../../../core/views/view-context');
const { capNhatThongTinForm } = require('./forms/cap-nhat-thong-tin.form');
const { doiMatKhauForm } = require('./forms/doi-mat-khau.form');

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

async function renderTrang(req, res, options = {}) {
    const nguoiDung = options.nguoiDung || await service.layThongTin(req);
    const capNhatState = options.capNhatState || {
        values: {
            tenDangNhap: nguoiDung.tenDangNhap || '',
            hoTen: nguoiDung.hoTen || ''
        }
    };
    const data = taoViewContext(req, res, {
        layout: 'user',
        page: {
            title: 'Tài khoản | Transform'
        },
        breadcrumb: [
            {
                label: 'Trang chủ',
                url: '/'
            },
            {
                label: 'Tài khoản',
                current: true
            }
        ],
        nguoiDung,
        capNhatThongTinForm: renderForm(capNhatThongTinForm, capNhatState, {
            csrfToken: res.locals.csrfToken
        }),
        doiMatKhauForm: renderForm(doiMatKhauForm, options.doiMatKhauState || {}, {
            csrfToken: res.locals.csrfToken
        })
    });
    return res.status(options.statusCode || 200).render('pages/user/tai-khoan/index', data);
}

async function index(req, res, next) {
    try { return await renderTrang(req, res); } catch (error) { return next(error); }
}

async function capNhatPost(req, res, next) {
    try {
        const values = await batBuocHopLe(capNhatThongTinForm, req.body, {
            req
        });
        await service.capNhatThongTin(req, values);
        req.flash('success', 'Cập nhật thông tin tài khoản thành công.');
        return res.redirect(303, '/user/tai-khoan');
    } catch (error) {
        if (Number(error?.statusCode || 400) >= 500) { return next(error); }
        try {
            return await renderTrang(req, res, {
                statusCode: Number(error?.statusCode || 400),
                capNhatState: taoFormState(req.body, error)
            });
        } catch (renderError) { return next(renderError); }
    }
}

async function doiMatKhauPost(req, res, next) {
    try {
        const values = await batBuocHopLe(doiMatKhauForm, req.body, {
            req
        });
        await service.doiMatKhau(req, values);
        req.flash('success', 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');
        return res.redirect(303, '/dang-nhap');
    } catch (error) {
        if (Number(error?.statusCode || 400) >= 500) { return next(error); }
        try {
            return await renderTrang(req, res, {
                statusCode: Number(error?.statusCode || 400),
                doiMatKhauState: taoFormState({}, error)
            });
        } catch (renderError) { return next(renderError); }
    }
}

module.exports = {
    index,
    capNhatPost,
    doiMatKhauPost
};