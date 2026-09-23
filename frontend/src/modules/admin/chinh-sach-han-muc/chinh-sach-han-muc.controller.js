'use strict';

const service = require('./chinh-sach-han-muc.service');
const { renderForm } = require('../../../core/forms/form-renderer');
const { batBuocHopLe } = require('../../../core/forms/form-validator');
const { FormError } = require('../../../core/forms/form-error');
const { taoViewContext, taoPagination } = require('../../../core/views/view-context');
const { taoChinhSachForm } = require('./forms/chinh-sach.form');

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
        doiTuong: String(query.doiTuong || ''),
        loaiTaiKhoan: String(query.loaiTaiKhoan || ''),
        goiDichVuId: String(query.goiDichVuId || ''),
        maHanhDong: String(query.maHanhDong || ''),
        donVi: String(query.donVi || ''),
        chuKy: String(query.chuKy || ''),
        active: String(query.active ?? ''),
        dangHieuLuc: String(query.dangHieuLuc ?? '')
    };
}

function taoGiaTriChinhSach(item) {
    return {
        ma: item.ma,
        ten: item.ten,
        doiTuong: item.doiTuong,
        loaiTaiKhoan: item.loaiTaiKhoan || '',
        goiDichVuId: item.goiDichVuId || '',
        maHanhDong: item.maHanhDong,
        donVi: item.donVi,
        chuKy: item.chuKy,
        muiGio: item.muiGio,
        gioiHan: item.gioiHan ?? '',
        khongGioiHan: item.khongGioiHan,
        hanhDongKhiVuot: item.hanhDongKhiVuot,
        mucDoUuTien: item.mucDoUuTien,
        hieuLucTu: service.dinhDangDateTimeInput(item.hieuLucTu),
        hieuLucDen: service.dinhDangDateTimeInput(item.hieuLucDen),
        active: item.active
    };
}

async function renderTrang(req, res, options = {}) {
    const [ ketQua, goiOptions ] = await Promise.all([
        service.layDanhSach(req, req.query),
        service.layGoiOptions(req)
    ]);
    const filters = taoFilters(req.query);
    const chinhSachDangChon = options.chinhSachDangChon || (req.query.id ? await service.layChiTiet(req, req.query.id) : null);
    const pagination = taoPagination({
        page: ketQua.phanTrang.page,
        totalPages: ketQua.phanTrang.totalPages,
        baseUrl: '/admin/chinh-sach-han-muc',
        query: filters
    });
    const taoForm = taoChinhSachForm({
        mode: 'create',
        goiOptions
    });
    const capNhatForm = chinhSachDangChon ? taoChinhSachForm({
        mode: 'update',
        id: chinhSachDangChon.id,
        goiOptions
    }) : null;
    const data = taoViewContext(req, res, {
        layout: 'admin',
        page: {
            title: 'Chính sách hạn mức | Transform Admin'
        },
        breadcrumb: [
            {
                label: 'Quản trị',
                url: '/admin'
            },
            {
                label: 'Chính sách hạn mức',
                current: true
            }
        ],
        danhSach: ketQua.danhSach,
        phanTrang: ketQua.phanTrang,
        pagination,
        filters,
        doiTuongOptions: service.DOI_TUONG_OPTIONS,
        loaiTaiKhoanOptions: service.LOAI_TAI_KHOAN_OPTIONS,
        maHanMucOptions: service.MA_HAN_MUC_OPTIONS,
        donViOptions: service.DON_VI_OPTIONS,
        chuKyOptions: service.CHU_KY_OPTIONS,
        goiOptions,
        chinhSachDangChon,
        taoChinhSachForm: renderForm(taoForm, options.taoState || {}, {
            csrfToken: res.locals.csrfToken
        }),
        capNhatChinhSachForm: capNhatForm ? renderForm(capNhatForm, options.capNhatState || {
            values: taoGiaTriChinhSach(chinhSachDangChon)
        }, {
            csrfToken: res.locals.csrfToken
        }) : null
    });
    return res.status(options.statusCode || 200).render('pages/admin/chinh-sach-han-muc/index', data);
}

async function index(req, res, next) {
    try { return await renderTrang(req, res); } catch (error) { return next(error); }
}

async function taoPost(req, res, next) {
    try {
        const goiOptions = await service.layGoiOptions(req);
        const form = taoChinhSachForm({
            mode: 'create',
            goiOptions
        });
        const values = await batBuocHopLe(form, req.body, {
            req
        });
        const chinhSach = await service.taoMoi(req, values);
        req.flash('success', 'Tạo chính sách hạn mức thành công.');
        return res.redirect(303, `/admin/chinh-sach-han-muc?id=${chinhSach.id}`);
    } catch (error) {
        if (Number(error?.statusCode || 400) >= 500) { return next(error); }
        try { return await renderTrang(req, res, { statusCode: Number(error?.statusCode || 400), taoState: taoFormState(req.body, error) }); } catch (renderError) { return next(renderError); }
    }
}

async function capNhatPost(req, res, next) {
    let chinhSach;
    try {
        chinhSach = await service.layChiTiet(req, req.params.id);
        const goiOptions = await service.layGoiOptions(req);
        const form = taoChinhSachForm({
            mode: 'update',
            id: chinhSach.id,
            goiOptions
        });
        const values = await batBuocHopLe(form, req.body, {
            req,
            chinhSach
        });
        await service.capNhat(req, chinhSach.id, values);
        req.flash('success', 'Cập nhật chính sách hạn mức thành công.');
        return res.redirect(303, `/admin/chinh-sach-han-muc?id=${chinhSach.id}`);
    } catch (error) {
        if (Number(error?.statusCode || 400) >= 500) { return next(error); }
        try {
            chinhSach = chinhSach || await service.layChiTiet(req, req.params.id);
            return await renderTrang(req, res, {
                statusCode: Number(error?.statusCode || 400),
                chinhSachDangChon: chinhSach,
                capNhatState: taoFormState(req.body, error)
            });
        } catch (renderError) { return next(renderError); }
    }
}

async function trangThaiPost(req, res, next) {
    try {
        const active = String(req.body?.active) === 'true';
        await service.capNhatTrangThai(req, req.params.id, active);
        req.flash('success', active ? 'Kích hoạt chính sách hạn mức thành công.' : 'Ngừng áp dụng chính sách hạn mức thành công.');
        return res.redirect(303, `/admin/chinh-sach-han-muc?id=${req.params.id}`);
    } catch (error) {
        if (Number(error?.statusCode || 500) < 500) {
            req.flash('error', error.message || 'Không thể cập nhật trạng thái chính sách.');
            return res.redirect(303, `/admin/chinh-sach-han-muc?id=${req.params.id}`);
        }
        return next(error);
    }
}

async function xoaPost(req, res, next) {
    try {
        await service.xoa(req, req.params.id);
        req.flash('success', 'Xóa chính sách hạn mức thành công.');
        return res.redirect(303, '/admin/chinh-sach-han-muc');
    } catch (error) {
        if (Number(error?.statusCode || 500) < 500) {
            req.flash('error', error.message || 'Không thể xóa chính sách hạn mức.');
            return res.redirect(303, `/admin/chinh-sach-han-muc?id=${req.params.id}`);
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