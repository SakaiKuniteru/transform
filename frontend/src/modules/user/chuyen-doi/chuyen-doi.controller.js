'use strict';
const { apiResponse } = require('@transform/shared');
const service = require('./chuyen-doi.service');
const { taoViewContext } = require('../../../core/views/view-context');
const { renderForm } = require('../../../core/forms/form-renderer');
const { taoChuyenDinhDangForm } = require('./forms/chuyen-dinh-dang.form');
const { taoHinhAnhForm } = require('./forms/hinh-anh.form');
const { taoResizeForm } = require('./forms/resize.form');
const { taoCropForm } = require('./forms/crop.form');
const { taoRotateForm } = require('./forms/rotate.form');
const { taoOptimizeForm } = require('./forms/optimize.form');
const { taoMaHoaForm } = require('./forms/ma-hoa.form');
const { taoGiaiMaForm } = require('./forms/giai-ma.form');
const { taoNenForm } = require('./forms/nen.form');
const { taoGiaiNenForm } = require('./forms/giai-nen.form');
const { taoOcrForm } = require('./forms/ocr.form');
const { taoTrichXuatForm } = require('./forms/trich-xuat.form');
const { taoDichForm } = require('./forms/dich.form');
const { taoAiTextForm } = require('./forms/ai-text.form');

const FORM_FACTORY = Object.freeze({
    'chuyen-dinh-dang': taoChuyenDinhDangForm,
    'hinh-anh': taoHinhAnhForm,
    resize: taoResizeForm,
    crop: taoCropForm,
    rotate: taoRotateForm,
    optimize: taoOptimizeForm,
    'ma-hoa': taoMaHoaForm,
    'giai-ma': taoGiaiMaForm,
    nen: taoNenForm,
    'giai-nen': taoGiaiNenForm,
    ocr: taoOcrForm,
    'trich-xuat': taoTrichXuatForm,
    dich: taoDichForm,
    'ai-text': taoAiTextForm
});

function chuanHoaTool(value) {
    const tool = String(value || 'chuyen-dinh-dang').trim().toLowerCase();
    return FORM_FACTORY[tool] ? tool : 'chuyen-dinh-dang';
}

function taoFormTheoTool(tool, context, state = {}) {
    const factory = FORM_FACTORY[chuanHoaTool(tool)];
    return renderForm(factory(context), state, { csrfToken: context.csrfToken });
}

function laJsonRequest(req) {
    if (req.xhr) { return true; }
    return req.accepts([ 'html', 'json' ]) === 'json';
}

async function index(req, res, next) {
    try {
        const tool = chuanHoaTool(req.query.tool);
        const dataTrang = await service.layTrang(req, req.query);
        const context = { ...dataTrang, csrfToken: res.locals.csrfToken };
        const data = taoViewContext(req, res, {
            layout: 'user',
            page: {
                title: 'Chuyển đổi | Transform',
                description: 'Chuyển đổi và xử lý tệp trực tuyến.'
            },
            breadcrumb: [
                {
                    label: 'Trang chủ',
                    url: '/'
                },
                {
                    label: 'Chuyển đổi',
                    current: true
                }
            ],
            ...dataTrang,
            tool,
            form: taoFormTheoTool(tool, context)
        });
        return res.render('pages/user/chuyen-doi/index', data);
    } catch (error) { return next(error); }
}

async function hoTro(req, res, next) {
    try { const data = await service.layHoTro(req, req.query); return res.json(apiResponse.taoThanhCong(data)); } catch (error) { return next(error); }
}

async function taoPost(req, res, next) {
    try {
        const ketQua = await service.tao(req, req.body);
        const statusCode = ketQua.daTonTai ? 200 : 201;
        if (laJsonRequest(req)) { return res.status(statusCode).json(apiResponse.taoThanhCong(ketQua, { message: ketQua.daTonTai ? 'Yêu cầu chuyển đổi đã tồn tại.' : 'Đã tạo yêu cầu chuyển đổi.' })); }
        req.flash('success', ketQua.daTonTai ? 'Yêu cầu chuyển đổi đã tồn tại.' : 'Đã tạo yêu cầu chuyển đổi.');
        return res.redirect(303, `/user/chuyen-doi/${ketQua.congViec.id}`);
    } catch (error) { return next(error); }
}

async function chiTiet(req, res, next) {
    try {
        const ketQua = await service.layChiTiet(req, req.params.id);
        const data = taoViewContext(req, res, {
            layout: 'user',
            page: {
                title: `Công việc #${ketQua.congViec.id} | Transform`
            },
            breadcrumb: [
                {
                    label: 'Trang chủ',
                    url: '/'
                },
                {
                    label: 'Chuyển đổi',
                    url: '/user/chuyen-doi'
                },
                {
                    label: `#${ketQua.congViec.id}`,
                    current: true
                }
            ],
            ketQua
        });
        return res.render('pages/user/chuyen-doi/ket-qua', data);
    } catch (error) { return next(error); }
}

module.exports = {
    index,
    hoTro,
    taoPost,
    chiTiet,
    chuanHoaTool,
    taoFormTheoTool
};