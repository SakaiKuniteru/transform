'use strict';
const { apiResponse } = require('@transform/shared');
const service = require('./chuyen-doi.service');
const { taoViewContext } = require('../../../core/views/view-context');

function laJsonRequest(req) {
    if (req.xhr) { return true; }
    return req.accepts([ 'html', 'json' ]) === 'json';
}

async function index(req, res, next) {
    try {
        const dataTrang = await service.layTrang(req, req.query);
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
            ...dataTrang
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
    chiTiet
};